-- CreateTable
CREATE TABLE "grades" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "grade_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grades_tenant_id_idx" ON "grades"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "grades_tenant_id_name_key" ON "grades"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "classes_tenant_id_idx" ON "classes"("tenant_id");

-- CreateIndex
CREATE INDEX "classes_grade_id_idx" ON "classes"("grade_id");

-- CreateIndex
CREATE UNIQUE INDEX "classes_tenant_id_name_key" ON "classes"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
