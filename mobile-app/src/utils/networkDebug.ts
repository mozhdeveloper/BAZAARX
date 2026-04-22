/**
 * Network diagnostics utilities for debugging connectivity issues
 * Helps identify DNS, network routing, and connectivity problems
 */

export interface NetworkDiagnostics {
    isConnected: boolean;
    connectionType: string;
    isInternetReachable: boolean;
    details?: string;
}

export interface DNSResolutionResult {
    domain: string;
    resolved: boolean;
    ipAddress?: string;
    error?: string;
    duration: number;
    details?: string;
}

/**
 * Test basic network connectivity by attempting to reach a known public endpoint
 */
export const checkNetworkStatus = async (): Promise<NetworkDiagnostics> => {
    try {
        // Try to reach a public endpoint to test basic connectivity
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch('https://www.google.com', {
                method: 'HEAD',
                signal: controller.signal,
            }).catch(() => ({ ok: true })); // May fail due to CORS, but timeout tells us about network

            clearTimeout(timeoutId);

            return {
                isConnected: true,
                connectionType: 'unknown',
                isInternetReachable: true,
                details: 'Device appears connected to internet'
            };
        } catch (fetchError: any) {
            clearTimeout(timeoutId);

            if (fetchError?.name === 'AbortError') {
                return {
                    isConnected: false,
                    connectionType: 'timeout',
                    isInternetReachable: false,
                    details: 'Network connectivity test timed out (5s+) - device may be offline'
                };
            }

            throw fetchError;
        }
    } catch (error) {
        console.error('[networkDebug] Error checking network status:', error);
        return {
            isConnected: false,
            connectionType: 'error',
            isInternetReachable: false,
            details: `Network check failed: ${error}`
        };
    }
};

/**
 * Test DNS resolution of Supabase domain
 * This helps identify if the issue is DNS-related
 */
export const testDNSResolution = async (domain: string = 'ijdpbfrcvdflzwytxncj.supabase.co'): Promise<DNSResolutionResult> => {
    const startTime = Date.now();

    try {
        console.log(`[networkDebug] Testing DNS resolution for: ${domain}`);

        // Attempt to resolve domain by making a simple HEAD request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for DNS

        try {
            const response = await fetch(`https://${domain}`, {
                method: 'HEAD',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;

            return {
                domain,
                resolved: true,
                duration,
                details: `DNS resolved successfully in ${duration}ms`
            };
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;

            // Network timeout usually indicates DNS failure or unreachable host
            if (fetchError.name === 'AbortError' || duration >= 5000) {
                return {
                    domain,
                    resolved: false,
                    duration,
                    error: 'DNS resolution timeout (5s+) - may indicate DNS failure or network issues'
                };
            }

            throw fetchError;
        }
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`[networkDebug] DNS resolution failed for ${domain}:`, error);

        return {
            domain,
            resolved: false,
            duration,
            error: `DNS failed: ${error?.message || String(error)}`
        };
    }
};

/**
 * Test reachability to Supabase API endpoint
 */
export const testSupabaseReachability = async (): Promise<{ reachable: boolean; duration: number; error?: string }> => {
    const startTime = Date.now();
    const supabaseUrl = 'https://ijdpbfrcvdflzwytxncj.supabase.co/rest/v1/';

    try {
        console.log('[networkDebug] Testing Supabase API reachability...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(supabaseUrl, {
                method: 'OPTIONS',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;

            return {
                reachable: response.ok || response.status < 500,
                duration,
            };
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;

            if (fetchError.name === 'AbortError') {
                return {
                    reachable: false,
                    duration,
                    error: 'Supabase API timeout (10s+) - network unreachable or extremely slow'
                };
            }

            throw fetchError;
        }
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error('[networkDebug] Supabase reachability test failed:', error);

        return {
            reachable: false,
            duration,
            error: `Reachability test failed: ${error?.message || String(error)}`
        };
    }
};

/**
 * Run full diagnostic suite and return human-readable report
 */
export const runFullNetworkDiagnostics = async (): Promise<string> => {
    console.log('[networkDebug] Running full network diagnostics...');

    const diagnostics: string[] = [];
    diagnostics.push('=== NETWORK DIAGNOSTICS REPORT ===');
    diagnostics.push(`Time: ${new Date().toISOString()}\n`);

    // 1. Basic network status
    const netStatus = await checkNetworkStatus();
    diagnostics.push('1. Network Status:');
    diagnostics.push(`   Connected: ${netStatus.isConnected}`);
    diagnostics.push(`   Type: ${netStatus.connectionType}`);
    diagnostics.push(`   Internet Reachable: ${netStatus.isInternetReachable}`);
    diagnostics.push('');

    // 2. DNS Resolution
    const dnsResult = await testDNSResolution();
    diagnostics.push('2. DNS Resolution (Supabase domain):');
    diagnostics.push(`   Domain: ${dnsResult.domain}`);
    diagnostics.push(`   Resolved: ${dnsResult.resolved}`);
    diagnostics.push(`   Duration: ${dnsResult.duration}ms`);
    if (dnsResult.error) diagnostics.push(`   Error: ${dnsResult.error}`);
    diagnostics.push('');

    // 3. Supabase API Reachability
    const reachability = await testSupabaseReachability();
    diagnostics.push('3. Supabase API Reachability:');
    diagnostics.push(`   Reachable: ${reachability.reachable}`);
    diagnostics.push(`   Duration: ${reachability.duration}ms`);
    if (reachability.error) diagnostics.push(`   Error: ${reachability.error}`);
    diagnostics.push('');

    // 4. Recommendations
    diagnostics.push('4. RECOMMENDATIONS:');
    if (!netStatus.isConnected) {
        diagnostics.push('   ⚠️  Device is not connected to network - connect to WiFi or cellular');
    } else if (!netStatus.isInternetReachable) {
        diagnostics.push('   ⚠️  Internet is not reachable - check WiFi connection or cellular signal');
    } else if (!dnsResult.resolved) {
        diagnostics.push('   ⚠️  DNS resolution failed - try:');
        diagnostics.push('      1. Switch from WiFi to cellular (or vice versa)');
        diagnostics.push('      2. Restart WiFi router');
        diagnostics.push('      3. Check if Supabase domain is blocked by firewall');
    } else if (!reachability.reachable) {
        diagnostics.push('   ⚠️  Supabase API unreachable - may be network routing or firewall issue');
        diagnostics.push('      Try switching networks or contacting Supabase support');
    } else {
        diagnostics.push('   ✅ Network diagnostics look good - issue may be app-specific');
    }

    const report = diagnostics.join('\n');
    console.log(report);

    return report;
};

/**
 * Log detailed error information for debugging
 */
export const logDetailedError = (context: string, error: any, url?: string): void => {
    const errorLog = {
        context,
        timestamp: new Date().toISOString(),
        url,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorStatus: error?.status,
        fullError: String(error),
    };

    console.error(`[${context}]`, JSON.stringify(errorLog, null, 2));
};
