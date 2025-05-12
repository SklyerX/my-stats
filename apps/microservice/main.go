package main

import (
	"context"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
)

type Body struct {
	S3Key     string `json:"s3_key"`
	ProcessID string `json:"process_id"`
	UserID    string `json:"user_id"`
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env found")
	}

	accessKey := os.Getenv("AWS_ACCESS_KEY_ID_ID")
	secretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	bucketName := os.Getenv("S3_BUCKET_NAME")
	region := os.Getenv("AWS_REGION")

	if accessKey == "" || secretKey == "" || region == "" || bucketName == "" {
		log.Fatal("AWS credentials and region must be set")
	}

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion("us-east-1"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKey,
			secretKey,
			"",
		)),
	)

	if err != nil {
		log.Fatalf("Unable to load SDK config %v:", err)
	}

	s3Client := s3.NewFromConfig(cfg)

	app := fiber.New()

	jobQueue := NewJobQueue(2, s3Client, bucketName)
	jobQueue.Start()

	app.Use(authChecker)

	app.Post("/process", func(c *fiber.Ctx) error {
		body := new(Body)

		if err := c.BodyParser(body); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"message": "Invalid request",
			})
		}

		if body.S3Key == "" || body.ProcessID == "" || body.UserID == "" {
			return c.Status(400).JSON(fiber.Map{
				"message": "Missing Field(s)",
			})
		}

		job := &Job{
			S3Key:     body.S3Key,
			ProcessID: body.ProcessID,
			UserID:    body.UserID,
		}

		jobQueue.AddJob(job)

		return c.JSON(fiber.Map{
			"message": "Job added to queue",
		})
	})

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "successfully running",
		})
	})

	log.Fatal(app.Listen(":8080"))
}

func authChecker(c *fiber.Ctx) error {
	apiKey := c.Get("x-api-key")
	secretKey := os.Getenv("APP_AUTH_KEY")

	if apiKey == "" || apiKey != secretKey {
		return c.Status(401).JSON(fiber.Map{
			"message": "Bad Authentication",
		})
	}

	return c.Next()
}
