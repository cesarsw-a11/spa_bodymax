-- CreateTable
CREATE TABLE `GiftCardOrder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(8) NOT NULL DEFAULT 'mxn',
    `serviceId` INTEGER NOT NULL,
    `serviceVariantId` INTEGER NULL,
    `serviceNameSnapshot` VARCHAR(191) NOT NULL,
    `serviceNameEnSnapshot` VARCHAR(191) NULL,
    `variantLabelSnapshot` VARCHAR(191) NULL,
    `variantLabelEnSnapshot` VARCHAR(191) NULL,
    `variantDurationSnapshot` INTEGER NULL,
    `recipientName` VARCHAR(120) NOT NULL,
    `senderName` VARCHAR(120) NOT NULL,
    `senderEmail` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `redeemCode` VARCHAR(32) NOT NULL,
    `stripeCheckoutSessionId` VARCHAR(255) NULL,
    `stripePaymentIntentId` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GiftCardOrder_redeemCode_key`(`redeemCode`),
    INDEX `GiftCardOrder_serviceId_idx`(`serviceId`),
    INDEX `GiftCardOrder_serviceVariantId_idx`(`serviceVariantId`),
    INDEX `GiftCardOrder_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GiftCardOrder` ADD CONSTRAINT `GiftCardOrder_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GiftCardOrder` ADD CONSTRAINT `GiftCardOrder_serviceVariantId_fkey` FOREIGN KEY (`serviceVariantId`) REFERENCES `ServiceVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
