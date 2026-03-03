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
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, MapPin, Phone, User, Mail, MessageCircle, Edit3, Check, X, Store } from 'lucide-react-native';
import { useSellerStore } from '../../src/stores/sellerStore';
import { useAuthStore } from '../../src/stores/authStore';
import { chatService } from '../../src/services/chatService';
import { orderService } from '../../src/services/orderService';
import { safeImageUri } from '../../src/utils/imageUtils';
import TrackingModal from '../../src/components/seller/TrackingModal';
import { returnService, MobileReturnRequest } from '../../src/services/returnService';

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

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

    // Return request state
    const [returnRequest, setReturnRequest] = useState<MobileReturnRequest | null>(null);
    const [returnLoading, setReturnLoading] = useState(false);
    const [returnActionLoading, setReturnActionLoading] = useState(false);

    // POS inline-edit state
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [isSavingCustomer, setIsSavingCustomer] = useState(false);
    const [isSavingDelivery, setIsSavingDelivery] = useState(false);

    useEffect(() => {
        const loadOrder = async () => {
            let foundOrder = orders.find(o => o.id === orderId || o.orderNumber === orderId || o.orderId === orderId);
            if (!foundOrder && seller?.id) {
                await fetchOrders(seller.id);
                foundOrder = orders.find(o => o.id === orderId || o.orderNumber === orderId || o.orderId === orderId);
            }
            if (foundOrder) {
                // Pre-fill editable POS fields
                const name = foundOrder.buyerName || '';
                const email = foundOrder.buyerEmail || '';
                setCustomerName(['Walk-in Customer', 'Walk-in', ''].includes(name) ? '' : name);
                setCustomerEmail(['pos@offline.sale', 'unknown@example.com', ''].includes(email) ? '' : email);
                // Pre-fill delivery address from shippingAddress if it's not In-Store
                const addr = foundOrder.shippingAddress;
                if (addr && typeof addr === 'object' && addr.street && addr.street !== 'In-Store Purchase') {
                    setDeliveryAddress([addr.street, addr.city, addr.province].filter(Boolean).join(', '));
                } else if (typeof addr === 'string' && addr !== 'In-store Pickup') {
                    setDeliveryAddress(addr);
                } else if (foundOrder.posNote && !foundOrder.posNote.startsWith('POS')) {
                    setDeliveryAddress(foundOrder.posNote);
                }
            }
            setOrder(foundOrder);
            setLoading(false);

            // Load return request if order shipment is in returned status
            if (foundOrder?.shipmentStatusRaw === 'returned') {
                setReturnLoading(true);
                const dbId = foundOrder.id || foundOrder.orderId;
                if (dbId && /^[0-9a-f-]{36}$/.test(dbId)) {
                    returnService.getReturnForOrder(dbId)
                        .then(r => setReturnRequest(r))
                        .catch(() => {})
                        .finally(() => setReturnLoading(false));
                } else {
                    setReturnLoading(false);
                }
            }
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
            if (newStatus === 'delivered') {
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

    const handleApproveReturn = async () => {
        if (!returnRequest) return;
        Alert.alert('Approve Refund', 'Are you sure you want to approve this return and process the refund?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve', style: 'default',
                onPress: async () => {
                    setReturnActionLoading(true);
                    try {
                        await returnService.approveReturn(returnRequest.id);
                        setReturnRequest({ ...returnRequest, status: 'approved', refundDate: new Date().toISOString() });
                        Alert.alert('Done', 'Refund approved. The buyer will be notified.');
                    } catch {
                        Alert.alert('Error', 'Failed to approve refund.');
                    } finally {
                        setReturnActionLoading(false);
                    }
                },
            },
        ]);
    };

    const handleRejectReturn = async () => {
        if (!returnRequest) return;
        Alert.alert('Reject Return', 'Please provide a reason for rejection.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reject', style: 'destructive',
                onPress: async () => {
                    setReturnActionLoading(true);
                    try {
                        await returnService.rejectReturn(returnRequest.id, 'Return rejected by seller');
                        setReturnRequest({ ...returnRequest, status: 'rejected' });
                        Alert.alert('Done', 'Return request rejected.');
                    } catch {
                        Alert.alert('Error', 'Failed to reject return.');
                    } finally {
                        setReturnActionLoading(false);
                    }
                },
            },
        ]);
    };

    // Counter-offer state
    const [counterOfferAmount, setCounterOfferAmount] = useState('');
    const [counterOfferNote, setCounterOfferNote] = useState('');
    const [showCounterOffer, setShowCounterOffer] = useState(false);

    const handleCounterOffer = async () => {
        if (!returnRequest) return;
        const amount = parseFloat(counterOfferAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Invalid', 'Please enter a valid amount.');
            return;
        }
        if (!counterOfferNote.trim()) {
            Alert.alert('Required', 'Please provide a reason for the counter-offer.');
            return;
        }
        setReturnActionLoading(true);
        try {
            await returnService.counterOfferReturn(returnRequest.id, amount, counterOfferNote.trim());
            setReturnRequest({ ...returnRequest, status: 'counter_offered', counterOfferAmount: amount, sellerNote: counterOfferNote.trim() });
            setShowCounterOffer(false);
            Alert.alert('Done', 'Counter-offer sent to buyer.');
        } catch {
            Alert.alert('Error', 'Failed to send counter-offer.');
        } finally {
            setReturnActionLoading(false);
        }
    };

    const handleRequestItemBack = async () => {
        if (!returnRequest) return;
        Alert.alert('Request Item Back', 'Generate a return label and ask the buyer to ship the item back?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Request Return', onPress: async () => {
                    setReturnActionLoading(true);
                    try {
                        await returnService.requestItemBack(returnRequest.id);
                        setReturnRequest({ ...returnRequest, status: 'return_in_transit', resolutionPath: 'return_required' });
                        Alert.alert('Done', 'Return label generated. Buyer will be notified to ship the item.');
                    } catch {
                        Alert.alert('Error', 'Failed to request item back.');
                    } finally {
                        setReturnActionLoading(false);
                    }
                },
            },
        ]);
    };

    const handleConfirmReturnReceived = async () => {
        if (!returnRequest) return;
        Alert.alert('Confirm Receipt', 'Confirm you received the returned item? This will trigger the refund.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Confirm & Refund', onPress: async () => {
                    setReturnActionLoading(true);
                    try {
                        await returnService.confirmReturnReceived(returnRequest.id);
                        setReturnRequest({ ...returnRequest, status: 'refunded', returnReceivedAt: new Date().toISOString(), refundDate: new Date().toISOString() });
                        Alert.alert('Done', 'Refund processed.');
                    } catch {
                        Alert.alert('Error', 'Failed to confirm receipt.');
                    } finally {
                        setReturnActionLoading(false);
                    }
                },
            },
        ]);
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

    // POS: save customer name + email to DB
    const handleSaveCustomer = async () => {
        if (!customerName.trim()) {
            Alert.alert('Required', 'Please enter a customer name.');
            return;
        }
        setIsSavingCustomer(true);
        try {
            await orderService.updateOrderDetails(order.id, {
                buyer_name: customerName.trim(),
                buyer_email: customerEmail.trim() || undefined,
            });
            // Update local order state so UI reflects saved data
            setOrder((prev: any) => ({
                ...prev,
                buyerName: customerName.trim(),
                buyerEmail: customerEmail.trim(),
            }));
            setIsEditingCustomer(false);
            Alert.alert('Saved', 'Customer details updated.');
        } catch {
            Alert.alert('Error', 'Failed to save customer details.');
        } finally {
            setIsSavingCustomer(false);
        }
    };

    // POS: save delivery address note to DB
    const handleSaveDelivery = async () => {
        setIsSavingDelivery(true);
        try {
            await orderService.updateOrderDetails(order.id, {
                notes: deliveryAddress.trim() || 'In-store Pickup',
            });
            Alert.alert('Saved', 'Delivery information updated.');
        } catch {
            Alert.alert('Error', 'Failed to save delivery information.');
        } finally {
            setIsSavingDelivery(false);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'delivered': return { color: '#10B981', bg: '#D1FAE5' };
            case 'shipped': return { color: '#3B82F6', bg: '#DBEAFE' };
            case 'confirmed': return { color: '#D97706', bg: '#FFF4EC' };
            case 'pending': return { color: '#FBBF24', bg: '#FEF3C7' };
            case 'cancelled': return { color: '#DC2626', bg: '#FEF2F2' };
            default: return { color: '#6B7280', bg: '#F3F4F6' };
        }
    };

    if (loading) return <ActivityIndicator style={styles.loader} color="#D97706" />;
    if (!order) return <View style={styles.empty}><Text>Order not found</Text></View>;

    const statusStyle = getStatusStyles(order.status);
    const isPOS = order.type === 'OFFLINE' || String(order.orderNumber || order.orderId || '').startsWith('POS-');

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
            {/* Themed Header */}
            <View style={[styles.customHeader, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerRow}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </Pressable>
                    <Text style={styles.headerTitle}>#{String(order.orderNumber || order.id).toUpperCase()}</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
                {/* Status Row */}
                <View style={styles.statusSection}>
                    <View style={styles.dateTimeContainer}>
                        <Text style={styles.dateLabel}>
                            {new Date(order.orderDate || order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </Text>
                        <Text style={styles.timeLabel}>
                            {new Date(order.orderDate || order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
                    <View style={[styles.detailCardHeader, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                        <Text style={styles.detailCardTitle}>Customer Details</Text>
                        {isPOS && !isEditingCustomer && (
                            <Pressable onPress={() => setIsEditingCustomer(true)} style={styles.editIconBtn}>
                                <Edit3 size={14} color="#D97706" />
                                <Text style={styles.editIconLabel}>Edit</Text>
                            </Pressable>
                        )}
                    </View>
                    <View style={styles.detailCardContent}>
                        {isPOS && isEditingCustomer ? (
                            <>
                                <View style={styles.editFieldGroup}>
                                    <View style={styles.editFieldRow}>
                                        <User size={15} color="#9CA3AF" style={{ marginTop: 12 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.editFieldLabel}>Customer Name <Text style={{ color: '#DC2626' }}>*</Text></Text>
                                            <TextInput
                                                style={styles.editInput}
                                                value={customerName}
                                                onChangeText={setCustomerName}
                                                placeholder="e.g. Juan Dela Cruz"
                                                placeholderTextColor="#9CA3AF"
                                                autoCapitalize="words"
                                            />
                                        </View>
                                    </View>
                                    <View style={styles.editFieldRow}>
                                        <Mail size={15} color="#9CA3AF" style={{ marginTop: 12 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.editFieldLabel}>Email <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional)</Text></Text>
                                            <TextInput
                                                style={styles.editInput}
                                                value={customerEmail}
                                                onChangeText={setCustomerEmail}
                                                placeholder="customer@email.com"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                            />
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.editActionRow}>
                                    <Pressable style={styles.editCancelBtn} onPress={() => setIsEditingCustomer(false)}>
                                        <X size={14} color="#6B7280" />
                                        <Text style={styles.editCancelLabel}>Discard</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.editSaveBtn, isSavingCustomer && { opacity: 0.6 }]}
                                        onPress={handleSaveCustomer}
                                        disabled={isSavingCustomer}
                                    >
                                        {isSavingCustomer
                                            ? <ActivityIndicator size="small" color="#FFF" />
                                            : <><Check size={14} color="#FFF" /><Text style={styles.editSaveLabel}>Save</Text></>}
                                    </Pressable>
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={styles.infoLine}>
                                    <User size={16} color="#9CA3AF" />
                                    <Text style={styles.custName}>
                                        {isPOS
                                            ? (customerName || 'Walk-in Customer')
                                            : (order.buyerName || 'Walk-in')}
                                    </Text>
                                    {isPOS && !customerName && (
                                        <Text style={styles.posHint}>Tap Edit to add name</Text>
                                    )}
                                </View>
                                <View style={[styles.infoLine, { marginTop: 8 }]}>
                                    <Mail size={16} color="#9CA3AF" />
                                    <Text style={styles.custEmail}>
                                        {isPOS
                                            ? (customerEmail || 'No email (optional)')
                                            : (order.buyerEmail || 'No email provided')}
                                    </Text>
                                </View>
                                {!isPOS && (
                                    <Pressable
                                        onPress={async () => {
                                            try {
                                                const sellerId = seller?.id;
                                                if (!sellerId || !order.buyerId) {
                                                    Alert.alert('Error', 'Unable to start chat — missing user info');
                                                    return;
                                                }
                                                const conversation = await chatService.getOrCreateConversation(
                                                    order.buyerId,
                                                    sellerId,
                                                    order.id
                                                );
                                                if (!conversation) {
                                                    Alert.alert('Error', 'Could not create conversation');
                                                    return;
                                                }
                                                (navigation as any).navigate('Chat', {
                                                    conversation,
                                                    currentUserId: sellerId,
                                                    userType: 'seller',
                                                });
                                            } catch (err) {
                                                console.error('Chat navigation error:', err);
                                                Alert.alert('Error', 'Failed to open chat');
                                            }
                                        }}
                                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FF6A0030', backgroundColor: '#FFF7F0' }}
                                    >
                                        <MessageCircle size={16} color="#FF6A00" />
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#FF6A00' }}>Chat with Buyer</Text>
                                    </Pressable>
                                )}
                                {isPOS && (
                                    <View style={styles.posTagRow}>
                                        <Store size={12} color="#D97706" />
                                        <Text style={styles.posTag}>POS / Walk-in Sale</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </View>

                {/* Return Request Section — shown when order is returned */}
                {order.shipmentStatusRaw === 'returned' && (
                    <View style={[styles.detailCard, { borderColor: '#FECDD3' }]}>
                        <View style={[styles.detailCardHeader, { backgroundColor: '#FFF1F2' }]}>
                            <Text style={[styles.detailCardTitle, { color: '#9B1C1C' }]}>Return / Refund Request</Text>
                        </View>
                        <View style={styles.detailCardContent}>
                            {returnLoading ? (
                                <ActivityIndicator color="#D97706" />
                            ) : returnRequest ? (
                                <>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ fontSize: 13, color: '#6B7280' }}>Status</Text>
                                        <Text style={{
                                            fontSize: 13, fontWeight: '700',
                                            color: returnRequest.status === 'approved' || returnRequest.status === 'refunded' ? '#10B981'
                                                 : returnRequest.status === 'rejected' ? '#DC2626'
                                                 : returnRequest.status === 'counter_offered' ? '#D97706'
                                                 : returnRequest.status === 'escalated' ? '#7C3AED'
                                                 : returnRequest.status === 'return_in_transit' ? '#3B82F6'
                                                 : '#D97706',
                                        }}>
                                            {returnRequest.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </Text>
                                    </View>
                                    {returnRequest.refundAmount != null && (
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <Text style={{ fontSize: 13, color: '#6B7280' }}>Refund Amount</Text>
                                            <Text style={{ fontSize: 13, fontWeight: '700' }}>₱{returnRequest.refundAmount.toLocaleString()}</Text>
                                        </View>
                                    )}
                                    {returnRequest.returnReason && (
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <Text style={{ fontSize: 13, color: '#6B7280' }}>Reason</Text>
                                            <Text style={{ fontSize: 13, fontWeight: '500' }}>
                                                {returnRequest.returnReason.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                            </Text>
                                        </View>
                                    )}
                                    {returnRequest.description && (
                                        <View style={{ marginBottom: 8 }}>
                                            <Text style={{ fontSize: 13, color: '#6B7280' }}>Description</Text>
                                            <Text style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{returnRequest.description}</Text>
                                        </View>
                                    )}

                                    {/* Evidence Photos */}
                                    {(returnRequest.evidenceUrls ?? []).length > 0 && (
                                        <View style={{ marginBottom: 12 }}>
                                            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>Evidence Photos</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                {returnRequest.evidenceUrls!.map((url: string, idx: number) => (
                                                    <Image key={idx} source={{ uri: url }} style={{ width: 70, height: 70, borderRadius: 10, marginRight: 8, backgroundColor: '#F3F4F6' }} />
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}

                                    {/* Seller Deadline */}
                                    {returnRequest.sellerDeadline && returnRequest.status === 'seller_review' && (
                                        <View style={{ backgroundColor: '#FEF3C7', padding: 8, borderRadius: 8, marginBottom: 12 }}>
                                            <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>
                                                ⏰ Deadline: {returnService.formatDeadlineRemaining(returnRequest.sellerDeadline)}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Seller Actions for pending/seller_review */}
                                    {(returnRequest.status === 'pending' || returnRequest.status === 'seller_review') && (
                                        <>
                                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                                                <Pressable
                                                    style={[{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981' }, returnActionLoading && { opacity: 0.6 }]}
                                                    onPress={handleApproveReturn}
                                                    disabled={returnActionLoading}
                                                >
                                                    {returnActionLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Approve Refund</Text>}
                                                </Pressable>
                                                <Pressable
                                                    style={[{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DC2626' }, returnActionLoading && { opacity: 0.6 }]}
                                                    onPress={handleRejectReturn}
                                                    disabled={returnActionLoading}
                                                >
                                                    <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 13 }}>Reject</Text>
                                                </Pressable>
                                            </View>

                                            {/* Counter-offer and Request Item Back */}
                                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                                                <Pressable
                                                    style={[{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' }, returnActionLoading && { opacity: 0.6 }]}
                                                    onPress={() => setShowCounterOffer(!showCounterOffer)}
                                                    disabled={returnActionLoading}
                                                >
                                                    <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 12 }}>Counter-Offer</Text>
                                                </Pressable>
                                                <Pressable
                                                    style={[{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#93C5FD' }, returnActionLoading && { opacity: 0.6 }]}
                                                    onPress={handleRequestItemBack}
                                                    disabled={returnActionLoading}
                                                >
                                                    <Text style={{ color: '#1E40AF', fontWeight: '700', fontSize: 12 }}>Request Item Back</Text>
                                                </Pressable>
                                            </View>

                                            {/* Counter-offer form */}
                                            {showCounterOffer && (
                                                <View style={{ marginTop: 10, backgroundColor: '#FFFBF0', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A' }}>
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 6 }}>Partial Refund Amount (₱)</Text>
                                                    <TextInput
                                                        style={{ borderWidth: 1, borderColor: '#D97706', borderRadius: 8, padding: 8, fontSize: 14, backgroundColor: '#FFF', marginBottom: 8 }}
                                                        keyboardType="numeric"
                                                        placeholder="e.g. 500"
                                                        value={counterOfferAmount}
                                                        onChangeText={setCounterOfferAmount}
                                                    />
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 6 }}>Reason / Note</Text>
                                                    <TextInput
                                                        style={{ borderWidth: 1, borderColor: '#D97706', borderRadius: 8, padding: 8, fontSize: 14, backgroundColor: '#FFF', minHeight: 60, textAlignVertical: 'top', marginBottom: 8 }}
                                                        multiline
                                                        placeholder="Explain your counter-offer..."
                                                        value={counterOfferNote}
                                                        onChangeText={setCounterOfferNote}
                                                    />
                                                    <Pressable
                                                        style={[{ paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#D97706' }, returnActionLoading && { opacity: 0.6 }]}
                                                        onPress={handleCounterOffer}
                                                        disabled={returnActionLoading}
                                                    >
                                                        {returnActionLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Send Counter-Offer</Text>}
                                                    </Pressable>
                                                </View>
                                            )}
                                        </>
                                    )}

                                    {/* Return in transit — confirm received */}
                                    {returnRequest.status === 'return_in_transit' && (
                                        <View style={{ marginTop: 8 }}>
                                            <View style={{ backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, marginBottom: 8 }}>
                                                <Text style={{ fontSize: 12, color: '#1E40AF' }}>
                                                    📦 Item is being shipped back. Tracking: {returnRequest.returnTrackingNumber || 'Pending'}
                                                </Text>
                                            </View>
                                            <Pressable
                                                style={[{ paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#10B981' }, returnActionLoading && { opacity: 0.6 }]}
                                                onPress={handleConfirmReturnReceived}
                                                disabled={returnActionLoading}
                                            >
                                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Confirm Received & Refund</Text>
                                            </Pressable>
                                        </View>
                                    )}

                                    {/* Finished states */}
                                    {(returnRequest.status === 'approved' || returnRequest.status === 'refunded') && (
                                        <View style={{ backgroundColor: '#F0FDF4', padding: 10, borderRadius: 8 }}>
                                            <Text style={{ fontSize: 12, color: '#065F46' }}>✓ Refund approved. Buyer will receive their refund within 7 business days.</Text>
                                        </View>
                                    )}
                                    {returnRequest.status === 'rejected' && (
                                        <View style={{ backgroundColor: '#FFF1F2', padding: 10, borderRadius: 8 }}>
                                            <Text style={{ fontSize: 12, color: '#9B1C1C' }}>✗ Return rejected. {returnRequest.rejectedReason || ''}</Text>
                                        </View>
                                    )}
                                    {returnRequest.status === 'counter_offered' && (
                                        <View style={{ backgroundColor: '#FFFBF0', padding: 10, borderRadius: 8 }}>
                                            <Text style={{ fontSize: 12, color: '#92400E' }}>
                                                💰 Counter-offer of ₱{returnRequest.counterOfferAmount?.toLocaleString()} sent. Waiting for buyer response.
                                            </Text>
                                        </View>
                                    )}
                                    {returnRequest.status === 'escalated' && (
                                        <View style={{ backgroundColor: '#F5F3FF', padding: 10, borderRadius: 8 }}>
                                            <Text style={{ fontSize: 12, color: '#5B21B6' }}>⚠️ Escalated to BAZAAR admin for review.</Text>
                                        </View>
                                    )}
                                </>
                            ) : (
                                <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                                    No return request found for this order.
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Delivery Information */}
                <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                        <Text style={styles.detailCardTitle}>Delivery Information</Text>
                        {isPOS && <Text style={styles.optionalHint}>Optional for in-store orders</Text>}
                    </View>
                    <View style={styles.detailCardContent}>
                        {isPOS ? (
                            <>
                                <View style={styles.editFieldRow}>
                                    <MapPin size={15} color="#9CA3AF" style={{ marginTop: 12 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.editFieldLabel}>Delivery Address <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional)</Text></Text>
                                        <TextInput
                                            style={[styles.editInput, { minHeight: 60 }]}
                                            value={deliveryAddress}
                                            onChangeText={setDeliveryAddress}
                                            placeholder="e.g. 123 Rizal St, Batangas City"
                                            placeholderTextColor="#9CA3AF"
                                            multiline
                                            textAlignVertical="top"
                                        />
                                    </View>
                                </View>
                                <Pressable
                                    style={[styles.editSaveBtn, { marginTop: 10, alignSelf: 'flex-end' }, isSavingDelivery && { opacity: 0.6 }]}
                                    onPress={handleSaveDelivery}
                                    disabled={isSavingDelivery}
                                >
                                    {isSavingDelivery
                                        ? <ActivityIndicator size="small" color="#FFF" />
                                        : <><Check size={14} color="#FFF" /><Text style={styles.editSaveLabel}>Save Address</Text></>}
                                </Pressable>
                            </>
                        ) : (
                            <>
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
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Sticky Footer Buttons */}
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.footerActionRow}>
                        {order.status === 'pending' && (
                            <Pressable style={[styles.primaryButton, { backgroundColor: '#D97706' }]} onPress={() => handleStatusUpdate('confirmed')}>
                                <Text style={styles.buttonText}>Confirm Order</Text>
                            </Pressable>
                        )}
                        {order.status === 'confirmed' && (
                            <Pressable style={[styles.primaryButton, { backgroundColor: '#D97706' }]} onPress={() => handleStatusUpdate('shipped')}>
                                <Text style={styles.buttonText}>Ship Order</Text>
                            </Pressable>
                        )}
                        {order.status === 'shipped' && (
                            <Pressable style={[styles.primaryButton, { backgroundColor: '#10B981' }]} onPress={() => handleStatusUpdate('delivered')}>
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
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF4EC' },
    loader: { flex: 1, justifyContent: 'center' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    customHeader: {
        backgroundColor: '#FFE5D9',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 20,
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
    detailCardHeader: { padding: 12, backgroundColor: '#FFF4EC', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
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
    totalValue: { fontSize: 19, fontWeight: '900', color: '#D97706' },
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
    cancelButtonText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
    // POS inline edit styles
    editIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FEF3C7' },
    editIconLabel: { fontSize: 12, fontWeight: '700', color: '#D97706' },
    editFieldGroup: { gap: 12 },
    editFieldRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    editFieldLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 4, marginTop: 8 },
    editInput: {
        borderWidth: 1,
        borderColor: '#D97706',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        color: '#1F2937',
        backgroundColor: '#FFFBF0',
    },
    editActionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    editSaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D97706', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
    editSaveLabel: { fontSize: 13, fontWeight: '700', color: '#FFF' },
    editCancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
    editCancelLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
    posTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
    posTag: { fontSize: 11, color: '#D97706', fontWeight: '600' },
    posHint: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginLeft: 4 },
    optionalHint: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
