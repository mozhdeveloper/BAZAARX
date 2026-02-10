import { useState, useEffect } from 'react';
import { regions, provinces, cities, barangays } from "select-philippines-address";

interface PhilippineAddressData {
  regionList: Array<{region_code: string, region_name: string}>;
  provinceList: Array<{province_code: string, province_name: string}>;
  cityList: Array<{city_code: string, city_name: string}>;
  barangayList: Array<{brgy_code: string, brgy_name: string}>;
  loading: boolean;
}

export const usePhilippineAddress = () => {
  const [data, setData] = useState<PhilippineAddressData>({
    regionList: [],
    provinceList: [],
    cityList: [],
    barangayList: [],
    loading: false
  });

  // Load regions on mount
  useEffect(() => {
    const loadRegions = async () => {
      try {
        setData(prev => ({ ...prev, loading: true }));
        const regionData = await regions();
        setData(prev => ({ 
          ...prev, 
          regionList: regionData,
          loading: false 
        }));
      } catch (error) {
        console.error('Error loading regions:', error);
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    loadRegions();
  }, []);

  const handleRegionChange = async (regionCode: string) => {
    try {
      setData(prev => ({ ...prev, loading: true }));
      
      // Clear dependent lists
      setData(prev => ({
        ...prev,
        provinceList: [],
        cityList: [],
        barangayList: []
      }));

      // Load provinces for selected region
      const provinceData = await provinces(regionCode);
      setData(prev => ({
        ...prev,
        provinceList: provinceData,
        loading: false
      }));

      return provinceData;
    } catch (error) {
      console.error('Error loading provinces:', error);
      setData(prev => ({ ...prev, loading: false }));
      return [];
    }
  };

  const handleProvinceChange = async (provinceCode: string) => {
    try {
      setData(prev => ({ ...prev, loading: true }));
      
      // Clear dependent lists
      setData(prev => ({
        ...prev,
        cityList: [],
        barangayList: []
      }));

      // Load cities for selected province
      const cityData = await cities(provinceCode);
      setData(prev => ({
        ...prev,
        cityList: cityData,
        loading: false
      }));

      return cityData;
    } catch (error) {
      console.error('Error loading cities:', error);
      setData(prev => ({ ...prev, loading: false }));
      return [];
    }
  };

  const handleCityChange = async (cityCode: string) => {
    try {
      setData(prev => ({ ...prev, loading: true }));
      
      // Clear barangay list
      setData(prev => ({
        ...prev,
        barangayList: []
      }));

      // Load barangays for selected city
      const barangayData = await barangays(cityCode);
      setData(prev => ({
        ...prev,
        barangayList: barangayData,
        loading: false
      }));

      return barangayData;
    } catch (error) {
      console.error('Error loading barangays:', error);
      setData(prev => ({ ...prev, loading: false }));
      return [];
    }
  };

  const resetAddressData = () => {
    setData({
      regionList: data.regionList, // Keep regions
      provinceList: [],
      cityList: [],
      barangayList: [],
      loading: false
    });
  };

  const hydrateAddressLists = async (regionName: string, provinceName: string, cityName: string) => {
    try {
      setData(prev => ({ ...prev, loading: true }));

      // Find Region Code by Name
      const regionMatch = data.regionList.find(r => r.region_name === regionName);
      if (!regionMatch) {
        throw new Error('Region not found');
      }

      // Load Provinces for this region
      const provs = await provinces(regionMatch.region_code);
      setData(prev => ({ ...prev, provinceList: provs }));

      const provinceMatch = provs.find(p => p.province_name === provinceName);
      if (!provinceMatch) {
        throw new Error('Province not found');
      }

      // Load Cities for this province
      const cts = await cities(provinceMatch.province_code);
      setData(prev => ({ ...prev, cityList: cts }));

      const cityMatch = cts.find(c => c.city_name === cityName);
      if (!cityMatch) {
        throw new Error('City not found');
      }

      // Load Barangays for this city
      const brgys = await barangays(cityMatch.city_code);
      setData(prev => ({ 
        ...prev, 
        barangayList: brgys,
        loading: false 
      }));

      return { provinces: provs, cities: cts, barangays: brgys };
    } catch (error) {
      console.error("Error re-hydrating address lists:", error);
      setData(prev => ({ ...prev, loading: false }));
      return null;
    }
  };

  return {
    ...data,
    handleRegionChange,
    handleProvinceChange,
    handleCityChange,
    resetAddressData,
    hydrateAddressLists
  };
};