-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('PENDING', 'PROCESSING', 'ACCEPTED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImageFormat" AS ENUM ('JPEG', 'PNG', 'HEIC');

-- CreateEnum
CREATE TYPE "RejectionReason" AS ENUM ('FILE_TOO_SMALL', 'UNREADABLE', 'RESOLUTION_TOO_LOW', 'NO_FACE', 'MULTIPLE_FACES', 'FACE_TOO_SMALL', 'BLURRY', 'DUPLICATE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "format" "ImageFormat" NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "status" "ImageStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" "RejectionReason",
    "width" INTEGER,
    "height" INTEGER,
    "original_key" TEXT NOT NULL,
    "normalized_key" TEXT,
    "thumbnail_key" TEXT,
    "perceptual_hash" BIGINT,
    "blur_score" DOUBLE PRECISION,
    "faces" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_at" TIMESTAMPTZ(3),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "processed_at" TIMESTAMPTZ(3),

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "images_user_created_idx" ON "images"("user_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "images_queue_idx" ON "images"("created_at") WHERE (status IN ('PENDING', 'PROCESSING'));

-- CreateIndex
CREATE INDEX "images_user_accepted_idx" ON "images"("user_id") WHERE (status = 'ACCEPTED');

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
