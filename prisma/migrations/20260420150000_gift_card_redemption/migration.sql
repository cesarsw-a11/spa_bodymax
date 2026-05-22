-- AlterTable
ALTER TABLE `GiftCardOrder`
    ADD COLUMN `redeemedAt` DATETIME(3) NULL,
    ADD COLUMN `redeemedBookingId` INT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `GiftCardOrder_redeemedBookingId_key` ON `GiftCardOrder`(`redeemedBookingId`);

-- CreateIndex
CREATE INDEX `GiftCardOrder_redeemedAt_idx` ON `GiftCardOrder`(`redeemedAt`);

-- AddForeignKey
ALTER TABLE `GiftCardOrder`
    ADD CONSTRAINT `GiftCardOrder_redeemedBookingId_fkey`
    FOREIGN KEY (`redeemedBookingId`) REFERENCES `Booking`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
