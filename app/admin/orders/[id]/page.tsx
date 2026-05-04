'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  getOrder,
  updateOrderStatus,
  createShipment,
  generateAWB,
  getLabel,
  cancelShipment
} from '@/lib/api'
import { Badge, Confirm, toast } from '@/components/admin/ui'

/* ================== TYPES ================== */

type OrderItem = {
  name: string
  image: string
  qty: number
  price: number
  total: number
  variant: string
}

type Order = {
  id: string
  status: string
  createdAt: string
  customer: {
    name: string
    email: string
    phone: string
  }
  shippingAddress: {
    line1: string
    city: string
    state: string
    pincode: string
    phone: string
  }
  items: OrderItem[]
  amount: number
  paymentMethod: string
  paymentStatus: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  shiprocketOrderId?: string
  awb?: string
  trackingUrl?: string
}

/* ================== MOCK ================== */

const MOCK_ORDER: Order = {
  id: 'TFM-87291',
  status: 'DELIVERED',
  createdAt: '18 Apr 2026 · 2:34 PM',
  customer: {
    name: 'Priya Sharma',
    email: 'priya@gmail.com',
    phone: '+91 9876543210'
  },
  shippingAddress: {
    line1: '123 Main Street',
    city: 'Tekkali',
    state: 'Andhra Pradesh',
    pincode: '532201',
    phone: '+91 9876543210'
  },
  items: [
    {
      name: 'Silk Saree',
      image: '🛍️',
      qty: 1,
      price: 1299,
      total: 1299,
      variant: 'Red'
    }
  ],
  amount: 1299,
  paymentMethod: 'ONLINE',
  paymentStatus: 'PAID',
  trackingUrl: ''
}

/* ================== CONSTANTS ================== */

const STEPS = [
  'Shipment\nCreated',
  'AWB\nGenerated',
  'Label\nPrinted',
  'Out for\nDelivery',
  'Delivered'
]

const STATUS_STEPS: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 0,
  SHIPPED: 3,
  DELIVERED: 5,
  CANCELLED: 0
}

/* ================== COMPONENT ================== */

export default function OrderDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [order, setOrder] = useState<Order>(MOCK_ORDER)
  const [newStatus, setNewStatus] = useState(order.status)
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl || '')
  const [saving, setSaving] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string>('')

  const doneSteps = STATUS_STEPS[order.status] || 0

  /* ================== ACTIONS ================== */

  async function handleStatusSave() {
    setSaving(true)
    try {
      await updateOrderStatus(order.id, { status: newStatus, trackingUrl })

      setOrder((o: Order) => ({
        ...o,
        status: newStatus,
        trackingUrl
      }))

      toast('Order status updated', 'success')
    } catch (e: any) {
      toast(e?.message || 'Something went wrong', 'error')
    }
    setSaving(false)
  }

  async function handleCreateShipment() {
    setActionLoading('shipment')
    try {
      await createShipment({ orderId: order.id })
      toast('Shipment created!', 'success')
    } catch (e: any) {
      toast(e?.message || 'Error', 'error')
    }
    setActionLoading('')
  }

  async function handleAWB() {
    setActionLoading('awb')
    try {
      await generateAWB({ shiprocketOrderId: order.shiprocketOrderId || '' })
      toast('AWB generated!', 'success')
    } catch (e: any) {
      toast(e?.message || 'Error', 'error')
    }
    setActionLoading('')
  }

  async function handleLabel() {
    setActionLoading('label')
    try {
      await getLabel({ awb: order.awb || '' })
      toast('Label downloading…', 'success')
    } catch (e: any) {
      toast(e?.message || 'Error', 'error')
    }
    setActionLoading('')
  }

  async function handleCancelShipment() {
    try {
      await cancelShipment({ awb: order.awb || '' })
      toast('Shipment cancelled', 'success')
    } catch (e: any) {
      toast(e?.message || 'Error', 'error')
    }
  }

  /* ================== UI ================== */

  return (
    <>
      <div style={{ display: 'flex', gap: 10 }}>
        <Link href="/admin/orders">← Back</Link>
        <span>{order.id}</span>
        <Badge status={order.status} />
      </div>

      {/* ITEMS */}
      <div>
        {order.items.map((item: OrderItem, i: number) => (
          <div key={i}>
            {item.name} — ₹{item.price}
          </div>
        ))}
      </div>

      {/* ACTIONS */}
      <button onClick={handleStatusSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Status'}
      </button>

      <button onClick={handleCreateShipment}>
        Create Shipment
      </button>

      <button onClick={handleAWB}>
        Generate AWB
      </button>

      <button onClick={handleLabel}>
        Download Label
      </button>

      <button onClick={() => setCancelOpen(true)}>
        Cancel Shipment
      </button>

      <Confirm
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelShipment}
        title="Cancel Shipment"
        message="This cannot be undone"
        confirmLabel="Yes"
      />
    </>
  )
}