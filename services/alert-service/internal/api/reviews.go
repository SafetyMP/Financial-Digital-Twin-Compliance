package api

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/digital-twin/platform/services/alert-service/internal/store"
)

type reviewRequest struct {
	RequestID string `json:"requestId"`
	Status    string `json:"status"`
	Note      string `json:"note"`
}

func (s *Server) recordReview(w http.ResponseWriter, r *http.Request) {
	principal := strings.TrimSpace(r.Header.Get("X-Principal"))
	if principal == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "trusted X-Principal required")
		return
	}
	var req reviewRequest
	r.Body = http.MaxBytesReader(w, r.Body, 16384)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid review JSON")
		return
	}
	if err := decoder.Decode(new(any)); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "exactly one JSON object required")
		return
	}
	input := store.ReviewInput{AlertID: r.PathValue("alertId"), RequestID: req.RequestID, Status: req.Status, Note: req.Note, ReviewedBy: principal}
	if err := store.ValidateReview(input); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "UUID issue and request IDs, valid status, note up to 2000 characters, and principal up to 256 characters required")
		return
	}
	result, err := s.store.RecordReview(r.Context(), input)
	if err != nil {
		reviewError(w, err)
		return
	}
	if !result.Replayed {
		s.hub.Broadcast("alert.reviewed", result.Alert)
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) listReviews(w http.ResponseWriter, r *http.Request) {
	if !store.ValidUUID(r.PathValue("alertId")) {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "valid issue UUID required")
		return
	}
	limit, offset := 200, 0
	var err error
	if value := r.URL.Query().Get("limit"); value != "" {
		limit, err = strconv.Atoi(value)
	}
	if err == nil {
		if value := r.URL.Query().Get("offset"); value != "" {
			offset, err = strconv.Atoi(value)
		}
	}
	if err != nil || limit < 1 || limit > 200 || offset < 0 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "limit must be 1-200 and offset nonnegative")
		return
	}
	reviews, err := s.store.ListReviews(r.Context(), r.PathValue("alertId"), limit, offset)
	if err != nil {
		reviewError(w, err)
		return
	}
	if reviews == nil {
		reviews = []store.Review{}
	}
	writeJSON(w, http.StatusOK, reviews)
}

func reviewError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, "NOT_FOUND", "alert not found")
	case errors.Is(err, store.ErrReviewConflict):
		writeError(w, http.StatusConflict, "CONFLICT", "requestId already used for a different review")
	case errors.Is(err, store.ErrInvalidReview):
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid review")
	default:
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to access review history")
	}
}
