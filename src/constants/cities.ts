export interface City {
  name: string;
  image: string;
  bannerImage?: string;
  lat: number;
  lng: number;
}

export const POPULAR_CITIES: City[] = [
  { name: 'Bangalore', image: 'https://i.pinimg.com/736x/65/2e/12/652e12e6d11188f44bf0094ad8bc245c.jpg??auto=format&fit=crop&q=80&w=400', bannerImage: 'https://b.zmtcdn.com/data/o2_assets/e067a1cf0d3fe27b366402b98b994e9f1716296909.png', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', image: 'https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&q=80&w=400', bannerImage: 'https://b.zmtcdn.com/data/o2_assets/e067a1cf0d3fe27b366402b98b994e9f1716296909.png', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', image: 'https://i.pinimg.com/736x/8b/94/6c/8b946c6b3a6d452dbea16a0ac556aa4d.jpg??auto=format&fit=crop&q=80&w=400', bannerImage: 'https://b.zmtcdn.com/data/o2_assets/e067a1cf0d3fe27b366402b98b994e9f1716296909.png', lat: 28.6139, lng: 77.2090 },
  { name: 'Hyderabad', image: 'https://i.pinimg.com/736x/b8/d0/6d/b8d06d9cea5a9831857e093f3403de37.jpg?auto=format&fit=crop&q=80&w=400', bannerImage: 'https://b.zmtcdn.com/data/o2_assets/e067a1cf0d3fe27b366402b98b994e9f1716296909.png', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&q=80&w=400', bannerImage: 'https://b.zmtcdn.com/data/o2_assets/e067a1cf0d3fe27b366402b98b994e9f1716296909.png', lat: 13.0827, lng: 80.2707 },
  { name: 'Pune', image: 'https://i.pinimg.com/736x/72/4f/96/724f96ae23d7889cc27caf8563427d0c.jpg?auto=format&fit=crop&q=80&w=400', bannerImage: 'https://b.zmtcdn.com/data/o2_assets/e067a1cf0d3fe27b366402b98b994e9f1716296909.png', lat: 18.5204, lng: 73.8567 },
  { name: 'Kolkata', image: 'https://i.pinimg.com/736x/9a/de/33/9ade339aeb1fcd1d74195b062d3e8191.jpg?auto=format&fit=crop&q=80&w=400', bannerImage: 'https://b.zmtcdn.com/data/o2_assets/e067a1cf0d3fe27b366402b98b994e9f1716296909.png', lat: 22.5726, lng: 88.3639 },
  { name: 'Jaipur', image: 'https://i.pinimg.com/736x/69/39/b1/6939b19b873db0e4d3402f9d3eff7528.jpg?auto=format&fit=crop&q=80&w=400', bannerImage: 'https://b.zmtcdn.com/data/o2_assets/e067a1cf0d3fe27b366402b98b994e9f1716296909.png', lat: 26.9124, lng: 75.7873 }
];

export const KNOWN_CITIES = [
  ...POPULAR_CITIES.map(c => c.name),
  'Ahmedabad', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Hubballi', 'Mysore', 'Tiruchirappalli', 'Bareilly', 'Aligarh', 'Gurgaon', 'Bhubaneswar'
];
