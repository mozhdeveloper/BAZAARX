import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    TextInput,
    Modal,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    ArrowLeft, X, Package, Truck, CheckCircle, XCircle,
    RefreshCw, Phone, User,
    MapPin
} from 'lucide-react-native';
import { useSellerStore } from '../../src/stores/sellerStore';
import { safeImageUri } from '../../src/utils/imageUtils';

// Fix for TS Error: Define valid status union
type OrderStatus = 'pending' | 'to-ship' | 'shipped' | 'completed' | 'cancelled';

export default function SellerOrderDetailScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { orderId } = route.params;

    const {
        orders = [],
        updateOrderStatus,
        markOrderAsShipped,
        seller,
        fetchOrders
    } = useSellerStore();

    const [order, setOrder] = useState<any>(null);
    const [trackingModalVisible, setTrackingModalVisible] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadOrder = async () => {
            let foundOrder = orders.find(o => o.id === orderId || o.orderId === orderId);

            if (!foundOrder && seller?.id) {
                await fetchOrders(seller.id);
                foundOrder = orders.find(o => o.id === orderId || o.orderId === orderId);
            }

            setOrder(foundOrder);
            setLoading(false);
        };
        loadOrder();
    }, [orderId, orders]);

    const handleStatusUpdate = async (newStatus: OrderStatus) => {
        if (newStatus === 'shipped') {
            setTrackingNumber('');
            setTrackingModalVisible(true);
            return;
        }

        try {
            setIsUpdating(true);
            await updateOrderStatus(orderId, newStatus);
            if (seller?.id) await fetchOrders(seller.id);
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleTrackingSubmit = async () => {
        if (!trackingNumber.trim()) {
            Alert.alert('Error', 'Please enter a tracking number');
            return;
        }

        try {
            setIsUpdating(true);
            await markOrderAsShipped(orderId, trackingNumber);
            setTrackingModalVisible(false);
            if (seller?.id) await fetchOrders(seller.id);
        } catch (error) {
            Alert.alert('Error', 'Failed to mark as shipped');
        } finally {
            setIsUpdating(false);
        }
    };

    // Helper functions for original styling
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return '#10B981';
            case 'shipped': return '#3B82F6';
            case 'to-ship': return '#FF5722';
            case 'pending': return '#FBBF24';
            case 'cancelled': return '#DC2626';
            default: return '#6B7280';
        }
    };

    const getStatusBgColor = (status: string) => {
        switch (status) {
            case 'completed': return '#D1FAE5';
            case 'shipped': return '#DBEAFE';
            case 'to-ship': return '#FFF5F0';
            case 'pending': return '#FEF3C7';
            case 'cancelled': return '#FEE2E2';
            default: return '#F3F4F6';
        }
    };

    if (loading) return <ActivityIndicator style={styles.loader} color="#FF5722" />;
    if (!order) return <View style={styles.empty}><Text>Order not found</Text></View>;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Ported Modal Header Design */}
            <View style={styles.editModalHeader}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 12 }}>
                        <Text style={styles.modalOrderId}>Order #{String(order.orderId || order.id).toUpperCase()}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(order.status) }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                                {String(order.status).replace('-', ' ').toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.modalOrderDate}>
                        {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                </View>
                <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <ArrowLeft size={24} color="#6B7280" />
                </Pressable>
            </View>

            <ScrollView style={styles.editModalBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Original Order Summary Card */}
                <View style={[styles.detailCard, { marginTop: 0 }]}>
                    <View style={styles.detailCardHeader}>
                        <Text style={styles.detailCardTitle}>Order Summary</Text>
                    </View>
                    <View style={styles.detailCardContent}>
                        {order.items.map((item: any, index: number) => (
                            <View key={index} style={styles.summaryItemRow}>
                                <Image source={{ uri: safeImageUri(item.image) }} style={styles.summaryItemImage} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.summaryItemName} numberOfLines={2}>{item.productName || item.name}</Text>
                                    <Text style={styles.summaryItemQty}>x{item.quantity}</Text>
                                </View>
                                <Text style={styles.summaryItemPrice}>₱{(item.price || 0).toLocaleString()}</Text>
                            </View>
                        ))}
                        <View style={styles.summaryDivider} />
                        <View style={[styles.breakdownRow, { marginTop: 8 }]}>
                            <Text style={styles.totalLabelLarge}>Total Amount</Text>
                            <Text style={styles.totalValueLarge}>₱{order.total.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Customer Information Card */}
                <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}><Text style={styles.detailCardTitle}>Customer</Text></View>
                    <View style={styles.detailCardContent}>
                        <Text style={styles.customerNameLarge}>{order.customerName || 'Walk-in'}</Text>
                        <Text style={styles.customerEmailText}>{order.customerEmail || 'No email provided'}</Text>
                    </View>
                </View>

                {/* Delivery Information Card */}
                <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                        <Text style={styles.detailCardTitle}>Delivery Information</Text>
                    </View>
                    <View style={styles.detailCardContent}>
                        <View style={styles.shipmentPending}>
                            <MapPin size={18} color="#9CA3AF" />
                            <Text style={styles.addressText}>
                                {typeof order.shippingAddress === 'string'
                                    ? order.shippingAddress
                                    : order.shippingAddress
                                        ? [
                                            order.shippingAddress.street,
                                            order.shippingAddress.barangay,
                                            order.shippingAddress.city,
                                            order.shippingAddress.province,
                                            order.shippingAddress.postalCode
                                        ].filter(Boolean).join(', ')
                                        : 'In-store Pickup'
                                }
                            </Text>
                        </View>

                        {/* Render Phone if it exists within the address object */}
                        {typeof order.shippingAddress === 'object' && order.shippingAddress?.phone && (
                            <View style={[styles.shipmentPending, { marginTop: 8 }]}>
                                <Phone size={16} color="#9CA3AF" />
                                <Text style={styles.addressText}>{order.shippingAddress.phone}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Ported Sticky Footer with Original Logic */}
            {order.status !== 'completed' && order.status !== 'cancelled' && (
                <View style={styles.stickyFooter}>
                    <View style={styles.footerActionRow}>
                        {order.status === 'pending' && (
                            <Pressable style={[styles.footerButton, { backgroundColor: '#FF5722' }]} onPress={() => handleStatusUpdate('to-ship')}>
                                <Text style={styles.footerButtonText}>Confirm Order</Text>
                            </Pressable>
                        )}
                        {order.status === 'to-ship' && (
                            <Pressable style={[styles.footerButton, { backgroundColor: '#FF5722' }]} onPress={() => handleStatusUpdate('shipped')}>
                                <Text style={styles.footerButtonText}>Ship Order</Text>
                            </Pressable>
                        )}
                        {order.status === 'shipped' && (
                            <Pressable style={[styles.footerButton, { backgroundColor: '#10B981' }]} onPress={() => handleStatusUpdate('completed')}>
                                <Text style={styles.footerButtonText}>Mark as Delivered</Text>
                            </Pressable>
                        )}
                        <Pressable style={[styles.footerButton, styles.footerButtonOutline]} onPress={() => handleStatusUpdate('cancelled')}>
                            <Text style={[styles.footerButtonText, { color: '#EF4444' }]}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Tracking Prompt Modal */}
            <Modal visible={trackingModalVisible} transparent animationType="fade">
                <View style={styles.promptOverlay}>
                    <View style={styles.promptContent}>
                        <Text style={styles.promptTitle}>Enter Tracking Number</Text>
                        <TextInput
                            style={styles.promptInput}
                            value={trackingNumber}
                            onChangeText={setTrackingNumber}
                            placeholder="e.g. BAX-12345"
                            autoFocus
                        />
                        <View style={styles.promptFooter}>
                            <Pressable style={[styles.promptButton, styles.promptButtonOutline]} onPress={() => setTrackingModalVisible(false)}>
                                <Text>Cancel</Text>
                            </Pressable>
                            <Pressable style={[styles.promptButton, styles.promptButtonPrimary]} onPress={handleTrackingSubmit}>
                                <Text style={{ color: '#fff' }}>Confirm</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Copy the styles directly from your original orders.tsx styles
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F7' },
    loader: { flex: 1, justifyContent: 'center' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#fff' },
    modalOrderId: { fontSize: 18, fontWeight: '800', color: '#111827' },
    modalOrderDate: { fontSize: 13, color: '#6B7280' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
    statusText: { fontSize: 11, fontWeight: '700' },
    closeButton: { padding: 4 },
    editModalBody: { padding: 20 },
    detailCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, overflow: 'hidden' },
    detailCardHeader: { padding: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    detailCardTitle: { fontSize: 14, fontWeight: '600', color: '#000' },
    detailCardContent: { padding: 16 },
    summaryItemRow: { flexDirection: 'row', marginBottom: 16, gap: 12 },
    summaryItemImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#F3F4F6' },
    summaryItemName: { fontSize: 14, fontWeight: '600', flex: 1 },
    summaryItemPrice: { fontSize: 14, fontWeight: '600' },
    summaryItemQty: { fontSize: 12, color: '#6B7280' },
    summaryDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
    totalLabelLarge: { fontSize: 16, fontWeight: '700' },
    totalValueLarge: { fontSize: 18, fontWeight: '800', color: '#FF5722' },
    customerNameLarge: { fontSize: 16, fontWeight: '700' },
    customerEmailText: { fontSize: 14, color: '#6B7280' },
    addressText: { fontSize: 14, color: '#4B5563', flex: 1, marginLeft: 8 },
    shipmentPending: { flexDirection: 'row', alignItems: 'center' },
    stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 16, paddingBottom: 30 },
    footerActionRow: { flexDirection: 'row', gap: 12 },
    footerButton: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    footerButtonOutline: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EF4444' },
    footerButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    promptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    promptContent: { width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24 },
    promptTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    promptInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 20 },
    promptFooter: { flexDirection: 'row', gap: 12 },
    promptButton: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    promptButtonPrimary: { backgroundColor: '#FF5722' },
    promptButtonOutline: { borderWidth: 1, borderColor: '#E5E7EB' },
});