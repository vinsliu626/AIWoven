CREATE TABLE "feature_usage_events" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "anonymous_visitor_id" TEXT,
  "session_id" TEXT,
  "feature_key" TEXT NOT NULL,
  "feature_name" TEXT NOT NULL,
  "page_path" TEXT,
  "action_type" TEXT NOT NULL,
  "metadata" JSONB,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "error_message" TEXT,
  "user_agent" TEXT,
  "ip_hash" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feature_usage_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_user_activity" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "activity_date" DATE NOT NULL,
  "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "session_count" INTEGER NOT NULL DEFAULT 1,
  "feature_call_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "daily_user_activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feature_daily_stats" (
  "id" TEXT NOT NULL,
  "feature_key" TEXT NOT NULL,
  "feature_name" TEXT NOT NULL,
  "stat_date" DATE NOT NULL,
  "total_calls" INTEGER NOT NULL DEFAULT 0,
  "unique_users" INTEGER NOT NULL DEFAULT 0,
  "success_count" INTEGER NOT NULL DEFAULT 0,
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "feature_daily_stats_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feature_usage_events_created_at_idx" ON "feature_usage_events"("created_at");
CREATE INDEX "feature_usage_events_feature_key_created_at_idx" ON "feature_usage_events"("feature_key", "created_at");
CREATE INDEX "feature_usage_events_user_id_created_at_idx" ON "feature_usage_events"("user_id", "created_at");
CREATE INDEX "feature_usage_events_anonymous_visitor_id_created_at_idx" ON "feature_usage_events"("anonymous_visitor_id", "created_at");
CREATE INDEX "feature_usage_events_session_id_created_at_idx" ON "feature_usage_events"("session_id", "created_at");
CREATE INDEX "feature_usage_events_action_type_created_at_idx" ON "feature_usage_events"("action_type", "created_at");

CREATE UNIQUE INDEX "daily_user_activity_user_id_activity_date_key" ON "daily_user_activity"("user_id", "activity_date");
CREATE INDEX "daily_user_activity_activity_date_idx" ON "daily_user_activity"("activity_date");
CREATE INDEX "daily_user_activity_last_seen_at_idx" ON "daily_user_activity"("last_seen_at");

CREATE UNIQUE INDEX "feature_daily_stats_feature_key_stat_date_key" ON "feature_daily_stats"("feature_key", "stat_date");
CREATE INDEX "feature_daily_stats_stat_date_idx" ON "feature_daily_stats"("stat_date");
CREATE INDEX "feature_daily_stats_feature_key_idx" ON "feature_daily_stats"("feature_key");

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('USER', 'OWNER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "UserEntitlement" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';
