-- CREATE TYPE "public"."entity_type" AS ENUM('artist', 'track', 'global');--> statement-breakpoint
-- CREATE TYPE "public"."milestone_type" AS ENUM('minutes', 'plays', 'days_streaked');--> statement-breakpoint

ALTER TYPE "public"."entity_type" ADD VALUE "global"