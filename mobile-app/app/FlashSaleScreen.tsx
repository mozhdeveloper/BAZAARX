import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from "@shopify/flash-list";
import { discountService } from '../src/services/discountService';

const useCountdown = (endDate: string) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(endDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  return timeLeft;
};

const FlashSaleCard = ({ product }: { product: any }) => {
  const timeLeft = useCountdown(product.campaignEndsAt);

  return (
    <View style={styles.card}>
      <Text>{product.name}</Text>
      <Text>Price: {product.price}</Text>
      <Text>Time left: {timeLeft}</Text>
    </View>
  );
};

export default function FlashSaleScreen() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        discountService.getFlashSaleProducts().then(data => {
            setProducts(data || []);
            setLoading(false);
        }).catch(console.error);
    }, []);

    if (loading) {
        return <ActivityIndicator />;
    }

    return (
        <View style={styles.container}>
            <FlashList
                data={products}
                renderItem={({ item }) => <FlashSaleCard product={item} />}
                estimatedItemSize={200}
            />
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

