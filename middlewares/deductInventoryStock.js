import { sequelize } from '../configs/db-postgres.js';
import { InventoryItem } from '../src/inventory/inventory.model.js';
import Order from '../src/orders/order.model.js';
import { sendLowStockEmail } from '../src/services/email.service.js';

const LEONEL_EMAIL = process.env.ROOT_ADMIN_EMAIL; 
const LEONEL_NAME  = 'Leonel';

export const deductInventoryStock = async (orderId) => {
  const transaction = await sequelize.transaction();
  const lowStockItems = [];

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
        lowStockItems.push({
          itemName     : inventoryItem.Name,
          currentStock : newStock,
          minStock     : inventoryItem.MinStock,
          unit         : inventoryItem.Unit,
          restaurantId : order.restaurantId.toString()
        });
      }
    }

    await transaction.commit();



    for (const item of lowStockItems) {
      await sendLowStockEmail({
        adminEmail   : LEONEL_EMAIL,
        adminName    : LEONEL_NAME,
        itemName     : item.itemName,
        currentStock : item.currentStock,
        minStock     : item.minStock,
        unit         : item.unit,
        restaurantId : item.restaurantId,
      });
    }

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};