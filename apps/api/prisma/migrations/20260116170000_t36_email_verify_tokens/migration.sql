-- CreateTable
CREATE TABLE "email_verify_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verify_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_verify_tokens_token_key" ON "email_verify_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verify_tokens_user_id_idx" ON "email_verify_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "email_verify_tokens" ADD CONSTRAINT "email_verify_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

