-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH', 'LOAN_GIVEN', 'LOAN_TAKEN', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AccountSubtype" AS ENUM ('WALLET', 'BANK', 'CREDIT_CARD', 'PERSONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('PAYMENT', 'RECEIPT');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "subtype" "AccountSubtype",
    "openingBalanceSatang" INTEGER NOT NULL DEFAULT 0,
    "openingDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" "TransactionKind" NOT NULL,
    "accountId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "totalSatang" INTEGER NOT NULL,
    "description" TEXT,
    "isFavourite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLine" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "amountSatang" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "TransactionLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_name_key" ON "Account"("userId", "name");

-- CreateIndex
CREATE INDEX "MoneyTransaction_userId_date_idx" ON "MoneyTransaction"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionLine_transactionId_accountId_key" ON "TransactionLine"("transactionId", "accountId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyTransaction" ADD CONSTRAINT "MoneyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyTransaction" ADD CONSTRAINT "MoneyTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "MoneyTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business-rule constraints Prisma cannot express (BR-02, BR-09) - second line of defence.
ALTER TABLE "Account" ADD CONSTRAINT "Account_openingBalance_range" CHECK ("openingBalanceSatang" >= 0 AND "openingBalanceSatang" <= 1000000000);
ALTER TABLE "MoneyTransaction" ADD CONSTRAINT "MoneyTransaction_total_range" CHECK ("totalSatang" > 0 AND "totalSatang" <= 1000000000);
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_amount_range" CHECK ("amountSatang" > 0 AND "amountSatang" <= 1000000000);
