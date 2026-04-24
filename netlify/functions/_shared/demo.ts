import type { Sector } from "./sectors";

export interface DemoBusiness {
  place_id: string;
  name: string;
  address: string;
  formatted_address: string;
  rating: number;
  user_ratings_total: number;
  types: string[];
  has_website: boolean;
  sector_hint: Sector;
  phone_numbers: string[];
  opening_hours: string[];
  editorial_summary?: string;
  reviews: Array<{ author: string; rating: number; text: string; relative_time: string }>;
  photo_refs: string[];
}

export const DEMO_DATA: Record<Sector, DemoBusiness[]> = {
  restaurants_tavernas: [
    {
      place_id: "demo_rest_1",
      name: "Taverna Aegean Blue",
      address: "Paralia Naousa, Paros 844 01",
      formatted_address: "Paralia Naousa, Paros 84401, Greece",
      rating: 4.7, user_ratings_total: 342, types: ["restaurant", "food"],
      has_website: false, sector_hint: "restaurants_tavernas",
      phone_numbers: ["+30 6944 123 456", "+30 22840 51234"],
      opening_hours: ["Mon–Sun: 12:00–00:00", "Seasonal: May–October"],
      editorial_summary: "Waterfront taverna in Naousa known for grilled fish and hand-made mezes.",
      reviews: [
        { author: "Sophie P.", rating: 5, text: "Best grilled octopus on the island. The view from the terrace at sunset is unreal.", relative_time: "2 months ago" },
        { author: "Markus", rating: 5, text: "Family-run feel, generous portions, fair prices. The owner came to say hello.", relative_time: "3 weeks ago" },
        { author: "Elena", rating: 4, text: "Loved the food, a bit slow on a busy Saturday but worth it.", relative_time: "1 month ago" },
      ],
      photo_refs: [],
    },
    {
      place_id: "demo_rest_2",
      name: "Giorgos' Kitchen",
      address: "Marpissa, Paros",
      formatted_address: "Marpissa village, Paros, Greece",
      rating: 4.6, user_ratings_total: 128, types: ["restaurant"],
      has_website: false, sector_hint: "restaurants_tavernas",
      phone_numbers: ["+30 6937 998 877"],
      opening_hours: ["Tue–Sun: 19:00–23:30", "Closed Mondays"],
      reviews: [
        { author: "Chris", rating: 5, text: "Home-cooked Greek food, everything fresh. The moussaka is incredible.", relative_time: "1 month ago" },
      ],
      photo_refs: [],
    },
    {
      place_id: "demo_tav_1",
      name: "Taverna To Steki",
      address: "Lefkes, Paros",
      formatted_address: "Central square, Lefkes, Paros, Greece",
      rating: 4.8, user_ratings_total: 210, types: ["restaurant", "greek_restaurant"],
      has_website: false, sector_hint: "restaurants_tavernas",
      phone_numbers: ["+30 6972 334 455"],
      opening_hours: ["Daily: 13:00–01:00"],
      editorial_summary: "Traditional mountain taverna run by the same family for three generations.",
      reviews: [
        { author: "Niki", rating: 5, text: "Hidden gem in Lefkes. Lamb on the spit is amazing.", relative_time: "2 weeks ago" },
      ],
      photo_refs: [],
    },
  ],
  beach_bar: [
    {
      place_id: "demo_bb_1",
      name: "Kalo Livadi Beach Club",
      address: "Kalo Livadi Beach, Mykonos",
      formatted_address: "Kalo Livadi Beach, Mykonos 84600, Greece",
      rating: 4.5, user_ratings_total: 512, types: ["bar"],
      has_website: false, sector_hint: "beach_bar",
      phone_numbers: ["+30 6945 112 233"],
      opening_hours: ["Daily: 10:00–22:00", "Seasonal: May–September"],
      reviews: [
        { author: "Paul", rating: 5, text: "Perfect vibe, great cocktails, friendly staff. Sunbed service is top-notch.", relative_time: "3 weeks ago" },
      ],
      photo_refs: [],
    },
  ],
  accommodations: [
    {
      place_id: "demo_villa_1",
      name: "Villa Althea",
      address: "Santa Maria, Paros",
      formatted_address: "Santa Maria, Paros 84401, Greece",
      rating: 4.9, user_ratings_total: 48, types: ["lodging", "guest_house"],
      has_website: false, sector_hint: "accommodations",
      phone_numbers: ["+30 6948 776 655"],
      opening_hours: ["Seasonal: April–October"],
      editorial_summary: "A private three-bedroom villa with pool, minutes from Santa Maria beach.",
      reviews: [
        { author: "Anna", rating: 5, text: "Stunning villa, private pool, hosts were incredibly helpful.", relative_time: "6 months ago" },
      ],
      photo_refs: [],
    },
    {
      place_id: "demo_hotel_1",
      name: "Hotel Meltemi Bay",
      address: "Piso Livadi, Paros",
      formatted_address: "Piso Livadi, Paros 84400, Greece",
      rating: 4.4, user_ratings_total: 220, types: ["lodging", "hotel"],
      has_website: false, sector_hint: "accommodations",
      phone_numbers: ["+30 6941 223 344", "+30 22840 41555"],
      opening_hours: ["Seasonal: May–October"],
      reviews: [
        { author: "Jacob", rating: 4, text: "Clean, comfortable, great location by the beach.", relative_time: "1 month ago" },
      ],
      photo_refs: [],
    },
  ],
  boutique: [{
    place_id: "demo_bout_1", name: "Athena Concept Store",
    address: "Market St., Parikia, Paros", formatted_address: "Market Street, Parikia, Paros",
    rating: 4.7, user_ratings_total: 72, types: ["clothing_store"],
    has_website: false, sector_hint: "boutique",
    phone_numbers: ["+30 6971 556 677"],
    opening_hours: ["Mon–Sat: 10:00–22:00"],
    reviews: [{ author: "Lena", rating: 5, text: "Beautiful curation of local designers.", relative_time: "2 weeks ago" }],
    photo_refs: [],
  }],
  car_rental: [{
    place_id: "demo_car_1", name: "Paros Wheels",
    address: "Parikia port, Paros", formatted_address: "Parikia port, Paros 84400, Greece",
    rating: 4.6, user_ratings_total: 180, types: ["car_rental"],
    has_website: false, sector_hint: "car_rental",
    phone_numbers: ["+30 6945 889 900"],
    opening_hours: ["Daily: 08:00–22:00"],
    reviews: [{ author: "Tom", rating: 5, text: "Clean cars, fair price, quick service.", relative_time: "1 month ago" }],
    photo_refs: [],
  }],
  boat_rental: [{
    place_id: "demo_boat_1", name: "Aegean Sails",
    address: "Naousa harbour, Paros", formatted_address: "Naousa harbour, Paros 84401, Greece",
    rating: 4.8, user_ratings_total: 54, types: ["point_of_interest"],
    has_website: false, sector_hint: "boat_rental",
    phone_numbers: ["+30 6949 001 122"],
    opening_hours: ["Seasonal: May–October"],
    reviews: [{ author: "Rita", rating: 5, text: "Unforgettable day cruising the small Cyclades.", relative_time: "3 weeks ago" }],
    photo_refs: [],
  }],
  beauty_wellness: [{
    place_id: "demo_beauty_1", name: "Studio Eirini",
    address: "Naousa, Paros", formatted_address: "Naousa, Paros 84401, Greece",
    rating: 4.9, user_ratings_total: 90, types: ["beauty_salon"],
    has_website: false, sector_hint: "beauty_wellness",
    phone_numbers: ["+30 6973 445 566"],
    opening_hours: ["Mon–Sat: 09:30–20:00"],
    reviews: [{ author: "Maria", rating: 5, text: "Best hair salon on Paros — Eirini really listens.", relative_time: "1 week ago" }],
    photo_refs: [],
  }],
  local_services: [{
    place_id: "demo_local_1", name: "Cyclades Property Care",
    address: "Paros, Greece", formatted_address: "Paros, Greece",
    rating: 4.7, user_ratings_total: 40, types: ["point_of_interest"],
    has_website: false, sector_hint: "local_services",
    phone_numbers: ["+30 6942 335 577"],
    opening_hours: ["Mon–Fri: 09:00–18:00"],
    reviews: [{ author: "Villa owner", rating: 5, text: "Reliable team, always responsive.", relative_time: "1 month ago" }],
    photo_refs: [],
  }],
};
