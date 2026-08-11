import re

with open('src/components/PartnerDashboardView.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '  const [takeawayOrders, setTakeawayOrders] = useState<any[]>([]);',
    '  const [takeawayOrders, setTakeawayOrders] = useState<any[]>([]);\n  const [bookingFilter, setBookingFilter] = useState<\'today\' | \'upcoming\' | \'previous\'>(\'today\');'
)

with open('src/components/PartnerDashboardView.tsx', 'w') as f:
    f.write(content)
