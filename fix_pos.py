import re
with open('src/components/POSTab.tsx', 'r') as f:
    content = f.read()

old_order_items = """    const orderItems = currentCart.map((c) => ({
      id: c.id,
      menuItemId: c.item.id,
      name: c.item.name,
      price: c.item.price,
      quantity: c.quantity,
      isVeg: c.item.isVeg,
      status: c.status
    }));"""

new_order_items = """    const orderItems = currentCart.map((c) => ({
      id: c.id,
      menuItemId: c.item.id,
      name: c.item.name,
      price: c.item.price,
      quantity: c.quantity,
      isVeg: c.item.isVeg ?? false,
      status: c.status
    }));"""

content = content.replace(old_order_items, new_order_items)

with open('src/components/POSTab.tsx', 'w') as f:
    f.write(content)
print("Fixed POSTab.tsx")
