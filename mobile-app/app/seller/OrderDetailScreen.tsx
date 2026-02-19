import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, MapPin, Phone, User, Mail } from 'lucide-react-native';
import { useSellerStore } from '../../src/stores/sellerStore';
import { safeImageUri } from '../../src/utils/imageUtils';
import TrackingModal from '../../src/components/seller/TrackingModal';

type OrderStatus = 'pending' | 'to-ship' | 'shipped' | 'completed' | 'cancelled';

export default function SellerOrderDetailScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { orderId } = route.params;

    const { orders = [], updateOrderStatus, markOrderAsShipped, markOrderAsDelivered, seller, fetchOrders } = useSellerStore();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [trackingModalVisible, setTrackingModalVisible] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

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
        // If marking as shipped, intercept and show the modal
        if (newStatus === 'shipped') {
            setTrackingNumber('');
            setTrackingModalVisible(true);
            return;
        }

        try {
            if (newStatus === 'completed') {
                await markOrderAsDelivered(orderId);
            } else {
                await updateOrderStatus(orderId, newStatus);
            }
            if (seller?.id) await fetchOrders(seller.id);
            Alert.alert("Success", `Order updated to ${newStatus.replace('-', ' ')}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleTrackingSubmit = async () => {
        if (!trackingNumber.trim()) {
            Alert.alert('Error', 'Please enter a tracking number');
            return;
        }

        setIsUpdating(true);
        try {
            // Fix: Removed the third argument (seller?.id) to match the expected 2 arguments
            await markOrderAsShipped(orderId, trackingNumber);

            setTrackingModalVisible(false);
            if (seller?.id) await fetchOrders(seller.id);
            Alert.alert("Success", "Order marked as shipped with tracking number.");
        } catch (error) {
            console.error('[OrderDetail] Failed to mark as shipped:', error);
            Alert.alert('Error', 'Failed to update tracking number');
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'completed': return { color: '#10B981', bg: '#D1FAE5' };
            case 'shipped': return { color: '#3B82F6', bg: '#DBEAFE' };
            case 'to-ship': return { color: '#FF5722', bg: '#FFF5F0' };
            case 'pending': return { color: '#FBBF24', bg: '#FEF3C7' };
            case 'cancelled': return { color: '#DC2626', bg: '#FEE2E2' };
            default: return { color: '#6B7280', bg: '#F3F4F6' };
        }
    };

    if (loading) return <ActivityIndicator style={styles.loader} color="#FF5722" />;
    if (!order) return <View style={styles.empty}><Text>Order not found</Text></View>;

    const statusStyle = getStatusStyles(order.status);

    return (
        <View style={styles.container}>
            {/* Themed Header */}
            <View style={[styles.customHeader, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerRow}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </Pressable>
                    <Text style={styles.headerTitle}>#{String(order.orderId || order.id).toUpperCase()}</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
                {/* Status Row */}
                <View style={styles.statusSection}>
                    <View style={styles.dateTimeContainer}>
                        <Text style={styles.dateLabel}>
                            {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </Text>
                        <Text style={styles.timeLabel}>
                            {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.color }]}>
                            {String(order.status).replace('-', ' ').toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Summary Card */}
                <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}><Text style={styles.detailCardTitle}>Order Summary</Text></View>
                    <View style={styles.detailCardContent}>
                        {order.items.map((item: any, index: number) => (
                            <View key={index} style={styles.itemRow}>
                                <Image source={{ uri: safeImageUri(item.image) }} style={styles.itemImage} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{item.productName || item.name}</Text>
                                    <Text style={styles.itemQty}>Quantity: {item.quantity}</Text>
                                </View>
                                <Text style={styles.itemPrice}>₱{(item.price || 0).toLocaleString()}</Text>
                            </View>
                        ))}
                        <View style={styles.divider} />
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total Amount</Text>
                            <Text style={styles.totalValue}>₱{order.total.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Customer Information */}
                <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}><Text style={styles.detailCardTitle}>Customer Details</Text></View>
                    <View style={styles.detailCardContent}>
                        <View style={styles.infoLine}><User size={16} color="#9CA3AF" /><Text style={styles.custName}>{order.customerName || 'Walk-in'}</Text></View>
                        <View style={[styles.infoLine, { marginTop: 8 }]}><Mail size={16} color="#9CA3AF" /><Text style={styles.custEmail}>{order.customerEmail || 'No email provided'}</Text></View>
                    </View>
                </View>

                {/* Delivery Information */}
                <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}><Text style={styles.detailCardTitle}>Delivery Information</Text></View>
                    <View style={styles.detailCardContent}>
                        <View style={styles.infoLine}>
                            <MapPin size={16} color="#9CA3AF" />
                            <Text style={styles.infoText}>
                                {typeof order.shippingAddress === 'string' ? order.shippingAddress :
                                    order.shippingAddress ? [order.shippingAddress.street, order.shippingAddress.city].filter(Boolean).join(', ') :
                                        'In-store Pickup'}
                            </Text>
                        </View>
                        {order.trackingNumber ? (
                            <View style={[styles.infoLine, { marginTop: 10 }]}>
                                <Text style={styles.trackingLabel}>Tracking:</Text>
                                <Text style={styles.infoText}>{order.trackingNumber}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </ScrollView>

            {/* Sticky Footer Buttons */}
            {order.status !== 'completed' && order.status !== 'cancelled' && (
                <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.footerActionRow}>
                        {order.status === 'pending' && (
                            <Pressable style={[styles.primaryButton, { backgroundColor: '#FF5722' }]} onPress={() => handleStatusUpdate('to-ship')}>
                                <Text style={styles.buttonText}>Confirm Order</Text>
                            </Pressable>
                        )}
                        {order.status === 'to-ship' && (
                            <Pressable style={[styles.primaryButton, { backgroundColor: '#FF5722' }]} onPress={() => handleStatusUpdate('shipped')}>
                                <Text style={styles.buttonText}>Ship Order</Text>
                            </Pressable>
                        )}
                        {order.status === 'shipped' && (
                            <Pressable style={[styles.primaryButton, { backgroundColor: '#10B981' }]} onPress={() => handleStatusUpdate('completed')}>
                                <Text style={styles.buttonText}>Mark as Delivered</Text>
                            </Pressable>
                        )}
                        <Pressable style={styles.cancelButton} onPress={() => handleStatusUpdate('cancelled')}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            <TrackingModal
                visible={trackingModalVisible}
                onClose={() => setTrackingModalVisible(false)}
                trackingNumber={trackingNumber}
                setTrackingNumber={setTrackingNumber}
                onSubmit={handleTrackingSubmit}
                isUpdating={isUpdating}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    loader: { flex: 1, justifyContent: 'center' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    customHeader: {
        backgroundColor: '#FFE5D9',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 15,
        elevation: 2,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
    backButton: { padding: 8 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#1F2937', textAlign: 'center' },
    statusSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginVertical: 20,
    },
    dateTimeContainer: { flex: 1 },
    dateLabel: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
    timeLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    statusText: { fontSize: 11, fontWeight: '800' },
    detailCard: { backgroundColor: '#FFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
    detailCardHeader: { padding: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    detailCardTitle: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
    detailCardContent: { padding: 16 },
    itemRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    itemImage: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#F3F4F6' },
    itemName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
    itemQty: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    itemPrice: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 15, fontWeight: '800' },
    totalValue: { fontSize: 19, fontWeight: '900', color: '#FF5722' },
    custName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
    custEmail: { fontSize: 13, color: '#6B7280' },
    infoLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    trackingLabel: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
    infoText: { fontSize: 13, color: '#4B5563', flex: 1 },
    // Sticky Footer Styles
    stickyFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingHorizontal: 20,
        paddingTop: 16,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    footerActionRow: { flexDirection: 'row', gap: 12 },
    primaryButton: { flex: 2, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    cancelButton: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#DC2626', justifyContent: 'center', alignItems: 'center' },
    cancelButtonText: { color: '#DC2626', fontSize: 15, fontWeight: '700' }
});
