import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
    endsAt: string | null;
    variant?: 'small' | 'large'; // Added variant prop
}

export const CampaignTimer: React.FC<Props> = ({ endsAt, variant = 'small' }) => {
    const [timeLeft, setTimeLeft] = useState({ h: '00', m: '00', s: '00' });

    useEffect(() => {
        if (!endsAt) return;
        const tick = () => {
            const diff = new Date(endsAt).getTime() - Date.now();
            if (diff <= 0) return setTimeLeft({ h: '00', m: '00', s: '00' });
            setTimeLeft({
                h: String(Math.floor(diff / 3600000)).padStart(2, '0'),
                m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
                s: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')
            });
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [endsAt]);

    const isSmall = variant === 'small';

    const TimeUnit = ({ value, label }: { value: string, label: string }) => (
        <View style={isSmall ? styles.unitBoxSmall : styles.unitBoxLarge}>
            <LinearGradient colors={['#EF4444', '#DC2626']} style={isSmall ? styles.digitBgSmall : styles.digitBgLarge}>
                <Text style={isSmall ? styles.digitTextSmall : styles.digitTextLarge}>{value}</Text>
            </LinearGradient>
            {!isSmall && <Text style={styles.unitLabelLarge}>{label}</Text>}
        </View>
    );

    return (
        <View style={styles.timerRow}>
            <TimeUnit value={timeLeft.h} label="HRS" />
            <Text style={isSmall ? styles.sepSmall : styles.sepLarge}>:</Text>
            <TimeUnit value={timeLeft.m} label="MINS" />
            <Text style={isSmall ? styles.sepSmall : styles.sepLarge}>:</Text>
            <TimeUnit value={timeLeft.s} label="SECS" />
        </View>
    );
};

const styles = StyleSheet.create({
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    // Small Variant (Home)
    unitBoxSmall: { alignItems: 'center' },
    digitBgSmall: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    digitTextSmall: { color: '#FFF', fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
    sepSmall: { fontSize: 16, fontWeight: '900', color: '#EF4444', paddingBottom: 2 },
    // Large Variant (Flash Sale Page)
    unitBoxLarge: { alignItems: 'center', gap: 4 },
    digitBgLarge: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    digitTextLarge: { color: '#FFF', fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
    unitLabelLarge: { fontSize: 8, fontWeight: '800', color: '#991B1B' },
    sepLarge: { fontSize: 24, fontWeight: '900', color: '#EF4444', marginBottom: 14 },
});