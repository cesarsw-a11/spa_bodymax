-- CreateTable
CREATE TABLE `ServiceVariant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceId` INTEGER NOT NULL,
    `durationMin` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `label` VARCHAR(191) NULL,
    `labelEn` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceVariant_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ServiceVariant` ADD CONSTRAINT `ServiceVariant_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `serviceVariantId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Booking_serviceVariantId_idx` ON `Booking`(`serviceVariantId`);

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_serviceVariantId_fkey` FOREIGN KEY (`serviceVariantId`) REFERENCES `ServiceVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Una variante por servicio existente (misma duración y precio)
INSERT INTO `ServiceVariant` (`serviceId`, `durationMin`, `price`, `sortOrder`, `active`, `createdAt`, `updatedAt`)
SELECT `id`, `durationMin`, `price`, 0, `active`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3) FROM `Service`;

-- Enlazar reservas a la variante del mismo servicio (solo hay una variante por serviceId tras el INSERT anterior)
UPDATE `Booking` b
INNER JOIN `ServiceVariant` v ON v.`serviceId` = b.`serviceId`
SET b.`serviceVariantId` = v.`id`
WHERE b.`serviceVariantId` IS NULL;
