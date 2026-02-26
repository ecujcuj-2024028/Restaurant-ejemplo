import { sequelize } from '../../configs/db-postgres.js';
import { InventoryItem } from '../src/inventory/inventory.model.js';
import Order from '../src/orders/order.model.js';

const sendLowStockEmail = async (inventoryItem) => {
  console.log(`LOW STOCK ALERT: ${inventoryItem.Name}`);
};

export const deductInventoryStock = async (orderId) => {
  const transaction = await sequelize.transaction();

  try {
    const order = await Order.findById(orderId);

    if (!order) throw new Error("Order no encontrada");

    for (const item of order.items) {

      const inventoryItem = await InventoryItem.findOne({
        where: {
          MongoProductId: item.productId.toString(),
          RestaurantId: order.restaurantId.toString()
        },
        transaction
      });

      if (!inventoryItem) {
        throw new Error(`No existe inventario para producto ${item.name}`);
      }

      const newStock =
        parseFloat(inventoryItem.Quantity) - parseFloat(item.quantity);

      if (newStock < 0) {
        throw new Error(`Stock insuficiente para ${inventoryItem.Name}`);
      }

      await inventoryItem.update(
        { Quantity: newStock },
        { transaction }
      );

      if (newStock <= parseFloat(inventoryItem.MinStock)) {
        await sendLowStockEmail(inventoryItem);
      }
    }

    await transaction.commit();

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};