-- BR-09 rev. 3.0 (Lab 7, #64): a Cash opening balance may be negative; other types stay >= 0.
-- Only the constraint changes. Every existing row is >= 0, so no data is rewritten.
ALTER TABLE "Account" DROP CONSTRAINT "Account_openingBalance_range";
ALTER TABLE "Account" ADD CONSTRAINT "Account_openingBalance_range" CHECK ("openingBalanceSatang" BETWEEN -1000000000 AND 1000000000 AND ("type" = 'CASH' OR "openingBalanceSatang" >= 0));
