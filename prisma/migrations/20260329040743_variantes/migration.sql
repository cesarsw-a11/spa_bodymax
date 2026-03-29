-- DropForeignKey
ALTER TABLE `Booking` DROP FOREIGN KEY `Booking_serviceVariantId_fkey`;

-- AlterTable
ALTER TABLE `Booking` MODIFY `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER';

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_serviceVariantId_fkey` FOREIGN KEY (`serviceVariantId`) REFERENCES `ServiceVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
