package common

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type postmarkEmailRequest struct {
	From          string `json:"From"`
	To            string `json:"To"`
	Subject       string `json:"Subject"`
	HtmlBody      string `json:"HtmlBody"`
	MessageStream string `json:"MessageStream,omitempty"`
}

var postmarkHTTPClient = &http.Client{Timeout: 30 * time.Second}

func postmarkAPIEmailURL() string {
	baseURL := strings.TrimRight(strings.TrimSpace(PostmarkAPIBaseURL), "/")
	if baseURL == "" {
		baseURL = DefaultPostmarkAPIBaseURL
	}
	return baseURL + "/email"
}

func postmarkSender() string {
	from := strings.TrimSpace(PostmarkFrom)
	if from == "" || strings.Contains(from, "<") || strings.TrimSpace(SystemName) == "" {
		return from
	}
	return fmt.Sprintf("%s <%s>", strings.TrimSpace(SystemName), from)
}

func postmarkRecipients(receiver string) (string, error) {
	parts := strings.FieldsFunc(receiver, func(r rune) bool {
		return r == ';' || r == ','
	})
	recipients := make([]string, 0, len(parts))
	for _, part := range parts {
		if recipient := strings.TrimSpace(part); recipient != "" {
			recipients = append(recipients, recipient)
		}
	}
	if len(recipients) == 0 {
		return "", fmt.Errorf("Postmark 收件人未配置")
	}
	return strings.Join(recipients, ","), nil
}

func SendEmail(subject string, receiver string, content string) error {
	token := strings.TrimSpace(PostmarkServerToken)
	if token == "" {
		return fmt.Errorf("Postmark Server Token 未配置")
	}
	from := postmarkSender()
	if from == "" {
		return fmt.Errorf("Postmark 发件人未配置")
	}
	to, err := postmarkRecipients(receiver)
	if err != nil {
		return err
	}

	payload := postmarkEmailRequest{
		From:          from,
		To:            to,
		Subject:       subject,
		HtmlBody:      content,
		MessageStream: strings.TrimSpace(PostmarkMessageStream),
	}
	if payload.MessageStream == "" {
		payload.MessageStream = "outbound"
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, postmarkAPIEmailURL(), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Postmark-Server-Token", token)

	resp, err := postmarkHTTPClient.Do(req)
	if err != nil {
		SysError(fmt.Sprintf("failed to send email to %s via Postmark: %v", receiver, err))
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		err = fmt.Errorf("Postmark 发送失败: status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	if err != nil {
		SysError(fmt.Sprintf("failed to send email to %s via Postmark: %v", receiver, err))
	}
	return err
}
