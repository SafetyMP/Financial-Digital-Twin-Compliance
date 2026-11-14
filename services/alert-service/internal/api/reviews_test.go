package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/digital-twin/platform/services/alert-service/internal/store"
)

const reviewAlertID = "550e8400-e29b-41d4-a716-446655440010"
const reviewRequestID = "550e8400-e29b-41d4-a716-446655440011"

func TestReviewValidationAndPrincipal(t *testing.T) {
	cases := []struct {
		name, body, principal string
		code                  int
	}{
		{"missing principal", `{"requestId":"` + reviewRequestID + `","status":"Acknowledged","note":""}`, "", 401},
		{"invalid request ID", `{"requestId":"bad","status":"Acknowledged","note":""}`, "reviewer", 400},
		{"unsupported outcome", `{"requestId":"` + reviewRequestID + `","status":"Approved","note":""}`, "reviewer", 400},
		{"spoofed body actor", `{"requestId":"` + reviewRequestID + `","status":"Acknowledged","note":"","reviewedBy":"other"}`, "reviewer", 400},
		{"trailing object", `{"requestId":"` + reviewRequestID + `","status":"Acknowledged","note":""}{}`, "reviewer", 400},
		{"oversized note", `{"requestId":"` + reviewRequestID + `","status":"Acknowledged","note":"` + strings.Repeat("a", 2001) + `"}`, "reviewer", 400},
		{"invalid principal", `{"requestId":"` + reviewRequestID + `","status":"Acknowledged","note":""}`, strings.Repeat("r", 257), 400},
		{"oversized body", strings.Repeat(" ", 16385) + `{}`, "reviewer", 400},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			called := false
			st := &fakeAlertStore{recordReview: func(context.Context, store.ReviewInput) (store.ReviewResult, error) {
				called = true
				return store.ReviewResult{}, nil
			}}
			req := httptest.NewRequest(http.MethodPost, "/api/v1/alerts/"+reviewAlertID+"/reviews", strings.NewReader(tc.body))
			req.Header.Set("X-Principal", tc.principal)
			rec := httptest.NewRecorder()
			NewServer(st, &fakeBroadcaster{}, "/ws/alerts").Handler().ServeHTTP(rec, req)
			if rec.Code != tc.code || called {
				t.Fatalf("status=%d called=%v body=%s", rec.Code, called, rec.Body.String())
			}
		})
	}
}

func TestRecordReviewUsesTrustedPrincipalAndReturnsHistory(t *testing.T) {
	for _, replayed := range []bool{false, true} {
		t.Run(map[bool]string{false: "created", true: "replayed"}[replayed], func(t *testing.T) {
			bc := &fakeBroadcaster{}
			st := &fakeAlertStore{recordReview: func(_ context.Context, input store.ReviewInput) (store.ReviewResult, error) {
				if input.ReviewedBy != "governance-reviewer" || input.AlertID != reviewAlertID || input.RequestID != reviewRequestID || input.Status != "Escalated" || input.Note != "Needs Treasury review" {
					t.Fatalf("input=%+v", input)
				}
				return store.ReviewResult{Review: store.Review{IssueID: input.AlertID, Note: input.Note, ReviewedBy: input.ReviewedBy}, Alert: store.Alert{AlertID: input.AlertID, Status: input.Status}, Replayed: replayed}, nil
			}}
			req := httptest.NewRequest(http.MethodPost, "/api/v1/alerts/"+reviewAlertID+"/reviews", strings.NewReader(`{"requestId":"`+reviewRequestID+`","status":"Escalated","note":"Needs Treasury review"}`))
			req.Header.Set("X-Principal", "governance-reviewer")
			rec := httptest.NewRecorder()
			NewServer(st, bc, "/ws/alerts").Handler().ServeHTTP(rec, req)
			if rec.Code != 200 {
				t.Fatalf("%d %s", rec.Code, rec.Body.String())
			}
			var got store.ReviewResult
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatal(err)
			}
			if got.Review.ReviewedBy != "governance-reviewer" || got.Replayed != replayed {
				t.Fatalf("result=%+v", got)
			}
			if replayed && bc.lastType != "" {
				t.Fatal("replayed request broadcast a new event")
			}
			if !replayed && bc.lastType != "alert.reviewed" {
				t.Fatal("new review did not broadcast")
			}
		})
	}
}

func TestReviewErrorMapping(t *testing.T) {
	for _, tc := range []struct {
		err  error
		code int
	}{{store.ErrNotFound, 404}, {store.ErrReviewConflict, 409}, {store.ErrInvalidReview, 400}, {errors.New("database unavailable"), 500}} {
		st := &fakeAlertStore{recordReview: func(context.Context, store.ReviewInput) (store.ReviewResult, error) {
			return store.ReviewResult{}, tc.err
		}}
		req := httptest.NewRequest(http.MethodPost, "/api/v1/alerts/"+reviewAlertID+"/reviews", strings.NewReader(`{"requestId":"`+reviewRequestID+`","status":"Acknowledged","note":""}`))
		req.Header.Set("X-Principal", "reviewer")
		rec := httptest.NewRecorder()
		NewServer(st, &fakeBroadcaster{}, "/ws/alerts").Handler().ServeHTTP(rec, req)
		if rec.Code != tc.code {
			t.Fatalf("%v: status=%d", tc.err, rec.Code)
		}
	}
}

func TestListReviewsPaginationAndEmptyArray(t *testing.T) {
	called := false
	st := &fakeAlertStore{listReviews: func(_ context.Context, id string, limit, offset int) ([]store.Review, error) {
		called = true
		if id != reviewAlertID || limit != 25 || offset != 50 {
			t.Fatalf("%s %d %d", id, limit, offset)
		}
		return nil, nil
	}}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/alerts/"+reviewAlertID+"/reviews?limit=25&offset=50", nil)
	rec := httptest.NewRecorder()
	NewServer(st, &fakeBroadcaster{}, "/ws/alerts").Handler().ServeHTTP(rec, req)
	if !called || rec.Code != 200 || strings.TrimSpace(rec.Body.String()) != "[]" {
		t.Fatalf("%d %s", rec.Code, rec.Body.String())
	}
	for _, query := range []string{"?limit=201", "?limit=0", "?offset=-1", "?offset=bad"} {
		called = false
		req = httptest.NewRequest(http.MethodGet, "/api/v1/alerts/"+reviewAlertID+"/reviews"+query, nil)
		rec = httptest.NewRecorder()
		NewServer(st, &fakeBroadcaster{}, "/ws/alerts").Handler().ServeHTTP(rec, req)
		if rec.Code != 400 || called {
			t.Fatalf("invalid pagination accepted: %s", query)
		}
	}
}

func TestReviewRoutesRequireConfiguredInternalToken(t *testing.T) {
	t.Setenv("INTERNAL_API_TOKEN", "review-internal-test")
	for _, method := range []string{http.MethodGet, http.MethodPost} {
		req := httptest.NewRequest(method, "/api/v1/alerts/"+reviewAlertID+"/reviews", nil)
		req.Header.Set("X-Principal", "reviewer")
		rec := httptest.NewRecorder()
		NewServer(&fakeAlertStore{}, &fakeBroadcaster{}, "/ws/alerts").Handler().ServeHTTP(rec, req)
		if rec.Code != 401 {
			t.Fatalf("%s without token status=%d", method, rec.Code)
		}
	}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/alerts/"+reviewAlertID+"/reviews", nil)
	req.Header.Set("X-Internal-Token", "review-internal-test")
	rec := httptest.NewRecorder()
	NewServer(&fakeAlertStore{}, &fakeBroadcaster{}, "/ws/alerts").Handler().ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("valid token status=%d", rec.Code)
	}
}
