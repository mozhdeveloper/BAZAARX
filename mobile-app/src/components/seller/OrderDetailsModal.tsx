import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    Pressable,
    Image,
} from 'react-native';
import { X, Package, Truck, CheckCircle, XCircle, RefreshCw, Phone } from 'lucide-react-native';
import { safeImageUri } from '../../utils/imageUtils';

interface OrderDetailsModalProps {
    visible: boolean;
    order: any;
    onClose: () => void;
    onStatusUpdate: (newStatus: 'pending' | 'to-ship' | 'shipped' | 'completed' | 'cancelled') => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
    visible,
    order,
    onClose,
    onStatusUpdate,
}) => {
    if (!order) return null;

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

    const calculateTotal = () => {
        if (order.total > 0) return order.total;
        return order.items.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.editModalContent}>
                    <View style={styles.editModalHeader}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 12 }}>
                                <Text style={styles.modalOrderId}>Order #{String(order.orderId || order.id || '').toUpperCase()}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(order.status) }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(order.status), fontSize: 11 }]}>
                                        {String(order.status || 'pending').replace('-', ' ').toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.modalOrderDate}>
                                {order.createdAt && new Date(order.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#6B7280" />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.editModalBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                        <View style={[styles.detailCard, { marginTop: 0 }]}>
                            <View style={styles.detailCardHeader}>
                                <Text style={styles.detailCardTitle}>Order Summary</Text>
                            </View>
                            <View style={styles.detailCardContent}>
                                {order.items.map((item: any, index: number) => (
                                    <View key={index} style={styles.summaryItemRow}>
                                        <Image source={{ uri: safeImageUri(item.image) }} style={styles.summaryItemImage} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.summaryItemName} numberOfLines={2}>{String(item.productName || 'Unknown Product')}</Text>
                                            {(item.selectedColor || item.selectedSize) && (
                                                <Text style={styles.summaryItemVariant}>
                                                    {item.selectedColor ? item.selectedColor : ''}
                                                    {item.selectedColor && item.selectedSize ? ' • ' : ''}
                                                    {item.selectedSize ? item.selectedSize : ''}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.summaryItemPrice}>₱{(item.price || 0).toLocaleString()}</Text>
                                            <Text style={styles.summaryItemQty}>x{item.quantity}</Text>
                                        </View>
                                    </View>
                                ))}
                                <View style={styles.summaryDivider} />
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Subtotal</Text>
                                    <Text style={styles.breakdownValue}>₱{calculateTotal().toLocaleString()}</Text>
                                </View>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Tax (0%)</Text>
                                    <Text style={styles.breakdownValue}>₱0.00</Text>
                                </View>
                                <View style={[styles.breakdownRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }]}>
                                    <Text style={styles.totalLabelLarge}>Total Amount</Text>
                                    <Text style={styles.totalValueLarge}>₱{calculateTotal().toLocaleString()}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.detailCard}>
                            <View style={styles.detailCardHeader}>
                                <Text style={styles.detailCardTitle}>Customer</Text>
                            </View>
                            <View style={styles.detailCardContent}>
                                <Text style={styles.customerNameLarge}>{order.customerName || 'Walk-in Customer'}</Text>
                                <Text style={styles.customerEmailText}>{order.customerEmail || 'No email provided'}</Text>
                            </View>
                        </View>

                        <View style={styles.detailCard}>
                            <View style={styles.detailCardHeader}>
                                <Text style={styles.detailCardTitle}>Delivery Information</Text>
                            </View>
                            <View style={styles.detailCardContent}>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={{ padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8, height: 36, width: 36, alignItems: 'center', justifyContent: 'center' }}>
                                        <Package size={18} color="#9CA3AF" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.deliveryLabel}>Ship to</Text>
                                        <Text style={styles.addressText}>
                                            {[
                                                order.shippingAddress?.street,
                                                order.shippingAddress?.barangay,
                                                order.shippingAddress?.city,
                                                order.shippingAddress?.province,
                                                order.shippingAddress?.postalCode
                                            ].filter(Boolean).join(', ') || 'No address provided'}
                                        </Text>
                                        <Text style={styles.addressCountry}>Philippines</Text>

                                        {(order.shippingAddress?.phone || order.customerPhone) && (
                                            <View style={styles.contactContainer}>
                                                <View style={styles.phoneRow}>
                                                    <Phone size={14} color="#9CA3AF" />
                                                    <Text style={styles.phoneText}>{order.shippingAddress?.phone || order.customerPhone}</Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.trackingContainer}>
                                    {order.status === 'completed' ? (
                                        <View style={styles.shipmentPending}>
                                            <View style={{ padding: 8, backgroundColor: '#D1FAE5', borderRadius: 8, height: 36, width: 40, alignItems: 'center', justifyContent: 'center' }}>
                                                <CheckCircle size={18} color="#10B981" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.pendingTitle, { color: '#059669' }]}>Delivered Successfully</Text>
                                                <Text style={styles.pendingText}>This order has been received by the customer.</Text>
                                            </View>
                                        </View>
                                    ) : order.status === 'shipped' ? (
                                        <View style={styles.shipmentPending}>
                                            <View style={{ padding: 8, backgroundColor: '#DBEAFE', borderRadius: 8, height: 36, width: 40, alignItems: 'center', justifyContent: 'center' }}>
                                                <Truck size={18} color="#3B82F6" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.pendingTitle, { color: '#2563EB' }]}>In Transit</Text>
                                                <Text style={styles.pendingText}>The package is currently with the courier for delivery.</Text>
                                                {order.trackingNumber && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                                        <Text style={[styles.pendingText, { color: '#6B7280', flex: 0 }]}>Tracking Number:</Text>
                                                        <Text style={{ fontWeight: '600', color: '#1F2937', fontSize: 14 }}>{order.trackingNumber}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    ) : order.status === 'to-ship' ? (
                                        <View style={styles.shipmentPending}>
                                            <View style={{ padding: 8, backgroundColor: '#FFF5F0', borderRadius: 8, height: 36, width: 40, alignItems: 'center', justifyContent: 'center' }}>
                                                <Package size={18} color="#FF5722" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.pendingTitle, { color: '#E44E1F' }]}>Preparing for Shipment</Text>
                                                <Text style={styles.pendingText}>Please pack the items and prepare the shipping label.</Text>
                                            </View>
                                        </View>
                                    ) : order.status === 'cancelled' ? (
                                        <View style={styles.shipmentPending}>
                                            <View style={{ padding: 8, backgroundColor: '#FEE2E2', borderRadius: 8, height: 36, width: 40, alignItems: 'center', justifyContent: 'center' }}>
                                                <XCircle size={18} color="#DC2626" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.pendingTitle, { color: '#DC2626' }]}>Shipment Cancelled</Text>
                                                <Text style={styles.pendingText}>The order has been cancelled and will not be shipped.</Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={styles.shipmentPending}>
                                            <View style={{ padding: 8, backgroundColor: '#FEF3C7', borderRadius: 8, height: 36, width: 40, alignItems: 'center', justifyContent: 'center' }}>
                                                <RefreshCw size={18} color="#F59E0B" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.pendingTitle, { color: '#B45309' }]}>Awaiting Confirmation</Text>
                                                <Text style={styles.pendingText}>Please review and confirm the order to start processing.</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <View style={styles.stickyFooter}>
                            {order.status === 'pending' && (
                                <View style={styles.footerActionRow}>
                                    <Pressable style={[styles.footerButton, { backgroundColor: '#FF5722' }]} onPress={() => onStatusUpdate('to-ship')}>
                                        <Text style={styles.footerButtonText}>Confirm Order</Text>
                                    </Pressable>
                                    <Pressable style={[styles.footerButton, styles.footerButtonOutline]} onPress={() => onStatusUpdate('cancelled')}>
                                        <Text style={[styles.footerButtonText, { color: '#EF4444' }]}>Cancel</Text>
                                    </Pressable>
                                </View>
                            )}
                            {order.status === 'to-ship' && (
                                <View style={styles.footerActionRow}>
                                    <Pressable style={[styles.footerButton, { backgroundColor: '#FF5722' }]} onPress={() => onStatusUpdate('shipped')}>
                                        <Text style={styles.footerButtonText}>Ship Order</Text>
                                    </Pressable>
                                    <Pressable style={[styles.footerButton, styles.footerButtonOutline]} onPress={() => onStatusUpdate('cancelled')}>
                                        <Text style={[styles.footerButtonText, { color: '#EF4444' }]}>Cancel</Text>
                                    </Pressable>
                                </View>
                            )}
                            {order.status === 'shipped' && (
                                <View style={styles.footerActionRow}>
                                    <Pressable style={[styles.footerButton, { backgroundColor: '#10B981' }]} onPress={() => onStatusUpdate('completed')}>
                                        <Text style={styles.footerButtonText}>Mark as Delivered</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    editModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 20,
    },
    editModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalOrderId: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 2,
    },
    modalOrderDate: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 100,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    editModalBody: {
        padding: 20,
    },
    detailCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
        overflow: 'hidden',
    },
    detailCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 8,
    },
    detailCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000000ff',
    },
    detailCardContent: {
        padding: 16,
    },
    summaryItemRow: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    summaryItemImage: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    summaryItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
        lineHeight: 20,
    },
    summaryItemVariant: {
        fontSize: 12,
        color: '#6B7280',
    },
    summaryItemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    summaryItemQty: {
        fontSize: 12,
        color: '#6B7280',
    },
    summaryDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 12,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    breakdownLabel: {
        fontSize: 13,
        color: '#6B7280',
    },
    breakdownValue: {
        fontSize: 13,
        color: '#1F2937',
        fontWeight: '500',
    },
    totalLabelLarge: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    totalValueLarge: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FF5722',
    },
    customerNameLarge: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    customerEmailText: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    deliveryLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    addressText: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
        marginBottom: 4,
    },
    addressCountry: {
        fontSize: 14,
        color: '#4B5563',
        marginBottom: 12,
    },
    contactContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    phoneText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    trackingContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    shipmentPending: {
        flexDirection: 'row',
        gap: 12,
    },
    pendingTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9CA3AF',
        marginBottom: 2,
    },
    pendingText: {
        fontSize: 14,
        color: '#4B5563',
        flex: 1,
    },
    stickyFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        padding: 16,
        paddingBottom: 20,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    footerActionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    footerButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    footerButtonOutline: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EF4444',
        shadowOpacity: 0.05,
    },
    footerButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

export default OrderDetailsModal;
