package main

import (
	"fmt"
	"os"

	cedar "github.com/cedar-policy/cedar-go"
)

func main() {
	if len(os.Args) != 2 {
		fmt.Fprintf(os.Stderr, "usage: checkparse <file>\n")
		os.Exit(2)
	}
	filename := os.Args[1]
	data, err := os.ReadFile(filename)
	if err != nil {
		fmt.Fprintf(os.Stderr, "read %s: %v\n", filename, err)
		os.Exit(2)
	}
	if _, err := cedar.NewPolicySetFromBytes(filename, data); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
