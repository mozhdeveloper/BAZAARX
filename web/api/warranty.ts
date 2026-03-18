import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Helper function to parse JSON body
function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Helper function to send JSON response
function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Helper function to get Supabase client
function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    // ========================================================================
    // GET /api/warranty?endpoint=product&productId=xxx
    // Get warranty information for a product
    // ========================================================================
    if (req.method === 'GET' && pathname.includes('/api/warranty')) {
      const endpoint = url.searchParams.get('endpoint');

      // Get product warranty
      if (endpoint === 'product') {
        const productId = url.searchParams.get('productId');
        if (!productId) {
          return sendJson(res, 400, { error: 'productId is required' });
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('products')
          .select(`
            has_warranty,
            warranty_type,
            warranty_duration_months,
            warranty_provider_name,
            warranty_provider_contact,
            warranty_provider_email,
            warranty_terms_url,
            warranty_policy
          `)
          .eq('id', productId)
          .single();

        if (error || !data) {
          return sendJson(res, 404, { error: 'Product not found' });
        }

        return sendJson(res, 200, {
          hasWarranty: data.has_warranty,
          warrantyType: data.warranty_type,
          warrantyDurationMonths: data.warranty_duration_months,
          warrantyProviderName: data.warranty_provider_name,
          warrantyProviderContact: data.warranty_provider_contact,
          warrantyProviderEmail: data.warranty_provider_email,
          warrantyTermsUrl: data.warranty_terms_url,
          warrantyPolicy: data.warranty_policy,
        });
      }

      // Get order item warranty status
      if (endpoint === 'order-item') {
        const orderItemId = url.searchParams.get('orderItemId');
        if (!orderItemId) {
          return sendJson(res, 400, { error: 'orderItemId is required' });
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('order_items')
          .select(`
            warranty_start_date,
            warranty_expiration_date,
            warranty_type,
            warranty_duration_months
          `)
          .eq('id', orderItemId)
          .single();

        if (error || !data) {
          return sendJson(res, 404, { error: 'Order item not found' });
        }

        if (!data.warranty_type || data.warranty_type === 'no_warranty' || !data.warranty_expiration_date) {
          return sendJson(res, 200, {
            isActive: false,
            isExpired: false,
            startDate: null,
            expirationDate: null,
            daysRemaining: null,
            warrantyType: null,
            canClaim: false,
          });
        }

        const now = new Date();
        const expirationDate = new Date(data.warranty_expiration_date);
        const startDate = data.warranty_start_date ? new Date(data.warranty_start_date) : null;
        const isExpired = now > expirationDate;
        const isActive = !isExpired && startDate !== null && now >= startDate;

        let daysRemaining: number | null = null;
        if (isActive) {
          const diffTime = expirationDate.getTime() - now.getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return sendJson(res, 200, {
          isActive,
          isExpired,
          startDate: data.warranty_start_date,
          expirationDate: data.warranty_expiration_date,
          daysRemaining,
          warrantyType: data.warranty_type,
          canClaim: isActive && !isExpired,
        });
      }

      // Get warranty claims
      if (endpoint === 'claims') {
        const supabase = getSupabaseClient();
        const buyerId = url.searchParams.get('buyerId');
        const sellerId = url.searchParams.get('sellerId');
        const status = url.searchParams.get('status');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');

        let query = supabase
          .from('warranty_claims')
          .select(`
            *,
            order_item:order_items(product_name, primary_image_url),
            buyer:buyers(*, profiles:profiles(first_name, last_name)),
            seller:sellers(store_name)
          `, { count: 'exact' });

        if (buyerId) query = query.eq('buyer_id', buyerId);
        if (sellerId) query = query.eq('seller_id', sellerId);
        if (status) query = query.eq('status', status);

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to).order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
          return sendJson(res, 500, { error: error.message });
        }

        return sendJson(res, 200, { claims: data, total: data.length });
      }

      // Get expiring warranties
      if (endpoint === 'expiring') {
        const buyerId = url.searchParams.get('buyerId');
        const daysThreshold = parseInt(url.searchParams.get('daysThreshold') || '30');

        if (!buyerId) {
          return sendJson(res, 400, { error: 'buyerId is required' });
        }

        const supabase = getSupabaseClient();
        const now = new Date();
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

        const { data, error } = await supabase
          .from('order_items')
          .select(`
            id,
            product_name,
            warranty_expiration_date,
            order_id
          `)
          .in(
            'order_id',
            supabase
              .from('orders')
              .select('id')
              .eq('buyer_id', buyerId)
          )
          .not('warranty_expiration_date', 'is', null)
          .gte('warranty_expiration_date', now.toISOString())
          .lte('warranty_expiration_date', thresholdDate.toISOString())
          .eq('warranty_claimed', false);

        if (error) {
          return sendJson(res, 500, { error: error.message });
        }

        const orderItems = data.map((item) => ({
          orderItemId: item.id,
          productName: item.product_name,
          expirationDate: item.warranty_expiration_date,
          daysRemaining: Math.ceil(
            (new Date(item.warranty_expiration_date!).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          ),
        }));

        return sendJson(res, 200, { orderItems });
      }

      return sendJson(res, 400, { error: 'Invalid endpoint' });
    }

    // ========================================================================
    // POST /api/warranty
    // Create warranty claim, log action, etc.
    // ========================================================================
    if (req.method === 'POST' && pathname.includes('/api/warranty')) {
      const body = await parseBody(req);
      const action = url.searchParams.get('action');
      const supabase = getSupabaseClient();

      // Create warranty claim
      if (action === 'create-claim') {
        const { orderItemId, reason, description, claimType, evidenceUrls, priority, buyerId } = body;

        if (!orderItemId || !reason || !claimType || !buyerId) {
          return sendJson(res, 400, { error: 'Missing required fields' });
        }

        // Get order item and order details
        const { data: orderItem, error: orderItemError } = await supabase
          .from('order_items')
          .select('order_id, warranty_type, warranty_expiration_date, warranty_claimed')
          .eq('id', orderItemId)
          .single();

        if (orderItemError || !orderItem) {
          return sendJson(res, 404, { error: 'Order item not found' });
        }

        if (orderItem.warranty_claimed) {
          return sendJson(res, 400, { error: 'Warranty already claimed for this item' });
        }

        // Check warranty expiration
        if (orderItem.warranty_expiration_date) {
          const now = new Date();
          const expirationDate = new Date(orderItem.warranty_expiration_date);
          if (now > expirationDate) {
            return sendJson(res, 400, { error: 'Warranty has expired' });
          }
        }

        // Get seller_id from order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('seller_id')
          .eq('id', orderItem.order_id)
          .single();

        if (orderError || !order?.seller_id) {
          return sendJson(res, 500, { error: 'Failed to get seller information' });
        }

        // Create warranty claim
        const { data: claim, error: claimError } = await supabase
          .from('warranty_claims')
          .insert({
            order_item_id: orderItemId,
            buyer_id: buyerId,
            seller_id: order.seller_id,
            reason,
            description: description || null,
            claim_type: claimType,
            evidence_urls: evidenceUrls || [],
            priority: priority || 'normal',
            status: 'pending',
          })
          .select()
          .single();

        if (claimError) {
          return sendJson(res, 500, { error: claimError.message });
        }

        // Update order item
        await supabase
          .from('order_items')
          .update({
            warranty_claimed: true,
            warranty_claimed_at: new Date().toISOString(),
            warranty_claim_status: 'pending',
            warranty_claim_reason: reason,
          })
          .eq('id', orderItemId);

        // Log the action
        await supabase.from('warranty_actions_log').insert({
          warranty_claim_id: claim.id,
          action_type: 'claim_created',
          actor_id: buyerId,
          actor_role: 'buyer',
          description: `Warranty claim created: ${reason}`,
          metadata: { claimType, priority: priority || 'normal' },
        });

        return sendJson(res, 201, { claim });
      }

      // Update warranty claim
      if (action === 'update-claim') {
        const { claimId, updaterId, updaterRole, ...updateData } = body;

        if (!claimId || !updaterId || !updaterRole) {
          return sendJson(res, 400, { error: 'Missing required fields' });
        }

        if (!['seller', 'admin'].includes(updaterRole)) {
          return sendJson(res, 403, { error: 'Unauthorized' });
        }

        const updatePayload: any = {};
        if (updateData.status) updatePayload.status = updateData.status;
        if (updateData.sellerResponse !== undefined) {
          updatePayload.seller_response = updateData.sellerResponse;
          updatePayload.seller_response_at = new Date().toISOString();
        }
        if (updateData.resolutionType !== undefined) {
          updatePayload.resolution_type = updateData.resolutionType;
        }
        if (updateData.resolutionDescription !== undefined) {
          updatePayload.resolution_description = updateData.resolutionDescription;
        }
        if (updateData.resolutionAmount !== undefined) {
          updatePayload.resolution_amount = updateData.resolutionAmount;
        }
        if (updateData.returnTrackingNumber !== undefined) {
          updatePayload.return_tracking_number = updateData.returnTrackingNumber;
        }
        if (updateData.returnShippingCarrier !== undefined) {
          updatePayload.return_shipping_carrier = updateData.returnShippingCarrier;
        }
        if (updateData.replacementTrackingNumber !== undefined) {
          updatePayload.replacement_tracking_number = updateData.replacementTrackingNumber;
        }
        if (updateData.replacementShippingCarrier !== undefined) {
          updatePayload.replacement_shipping_carrier = updateData.replacementShippingCarrier;
        }
        if (updateData.adminNotes !== undefined) {
          updatePayload.admin_notes = updateData.adminNotes;
        }

        if (['resolved', 'refund_processed'].includes(updateData.status)) {
          updatePayload.resolved_at = new Date().toISOString();
          updatePayload.resolved_by = updaterRole === 'admin' ? updaterId : null;
        }

        const { data: claim, error: updateError } = await supabase
          .from('warranty_claims')
          .update(updatePayload)
          .eq('id', claimId)
          .select()
          .single();

        if (updateError) {
          return sendJson(res, 500, { error: updateError.message });
        }

        // Log the action
        let actionType = 'claim_reviewed';
        if (updateData.status === 'approved') actionType = 'claim_approved';
        if (updateData.status === 'rejected') actionType = 'claim_rejected';
        if (updateData.status === 'repair_in_progress') actionType = 'repair_started';
        if (updateData.status === 'replacement_sent') actionType = 'replacement_shipped';
        if (updateData.status === 'refund_processed') actionType = 'refund_initiated';
        if (updateData.status === 'resolved') actionType = 'claim_resolved';

        await supabase.from('warranty_actions_log').insert({
          warranty_claim_id: claimId,
          action_type: actionType,
          actor_id: updaterId,
          actor_role: updaterRole,
          description: `Claim ${updateData.status || 'updated'} by ${updaterRole}`,
        });

        return sendJson(res, 200, { claim });
      }

      // Cancel warranty claim
      if (action === 'cancel-claim') {
        const { claimId, buyerId } = body;

        if (!claimId || !buyerId) {
          return sendJson(res, 400, { error: 'Missing required fields' });
        }

        const { data: claim, error: fetchError } = await supabase
          .from('warranty_claims')
          .select('buyer_id, status')
          .eq('id', claimId)
          .single();

        if (fetchError || !claim) {
          return sendJson(res, 404, { error: 'Claim not found' });
        }

        if (claim.buyer_id !== buyerId) {
          return sendJson(res, 403, { error: 'Unauthorized' });
        }

        if (!['pending', 'under_review'].includes(claim.status)) {
          return sendJson(res, 400, { error: 'Cannot cancel claim in current status' });
        }

        await supabase
          .from('warranty_claims')
          .update({
            status: 'cancelled',
            resolved_at: new Date().toISOString(),
          })
          .eq('id', claimId);

        await supabase.from('warranty_actions_log').insert({
          warranty_claim_id: claimId,
          action_type: 'claim_cancelled',
          actor_id: buyerId,
          actor_role: 'buyer',
          description: 'Claim cancelled by buyer',
        });

        return sendJson(res, 200, { success: true });
      }

      // Log warranty action
      if (action === 'log-action') {
        const { warrantyClaimId, orderItemId, actionType, actorId, actorRole, description, metadata } = body;

        if (!actionType || !actorRole) {
          return sendJson(res, 400, { error: 'Missing required fields' });
        }

        const { error } = await supabase.from('warranty_actions_log').insert({
          warranty_claim_id: warrantyClaimId,
          order_item_id: orderItemId,
          action_type: actionType,
          actor_id: actorId,
          actor_role: actorRole,
          description: description || null,
          metadata: metadata || {},
        });

        if (error) {
          return sendJson(res, 500, { error: error.message });
        }

        return sendJson(res, 201, { success: true });
      }

      return sendJson(res, 400, { error: 'Invalid action' });
    }

    // ========================================================================
    // PUT /api/warranty - Update product warranty info (admin/seller only)
    // ========================================================================
    if (req.method === 'PUT' && pathname.includes('/api/warranty')) {
      const body = await parseBody(req);
      const { productId, warrantyData, updaterId, updaterRole } = body;

      if (!productId || !warrantyData) {
        return sendJson(res, 400, { error: 'Missing required fields' });
      }

      // Only admins or the product's seller can update warranty info
      const supabase = getSupabaseClient();

      const updatePayload: any = {};
      if (warrantyData.hasWarranty !== undefined) updatePayload.has_warranty = warrantyData.hasWarranty;
      if (warrantyData.warrantyType !== undefined) updatePayload.warranty_type = warrantyData.warrantyType;
      if (warrantyData.warrantyDurationMonths !== undefined) {
        updatePayload.warranty_duration_months = warrantyData.warrantyDurationMonths;
      }
      if (warrantyData.warrantyProviderName !== undefined) {
        updatePayload.warranty_provider_name = warrantyData.warrantyProviderName;
      }
      if (warrantyData.warrantyProviderContact !== undefined) {
        updatePayload.warranty_provider_contact = warrantyData.warrantyProviderContact;
      }
      if (warrantyData.warrantyProviderEmail !== undefined) {
        updatePayload.warranty_provider_email = warrantyData.warrantyProviderEmail;
      }
      if (warrantyData.warrantyTermsUrl !== undefined) {
        updatePayload.warranty_terms_url = warrantyData.warrantyTermsUrl;
      }
      if (warrantyData.warrantyPolicy !== undefined) {
        updatePayload.warranty_policy = warrantyData.warrantyPolicy;
      }

      const { data, error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', productId)
        .select()
        .single();

      if (error) {
        return sendJson(res, 500, { error: error.message });
      }

      return sendJson(res, 200, { product: data });
    }

    // Method not allowed
    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Error:', errorMessage);
    return sendJson(res, 500, { error: errorMessage });
  }
}
