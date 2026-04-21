// data/blog-data.js
// Central configuration for all blog posts - easily scalable to 1000+ posts

const blogConfig = {
  locations: {
    kitengela: {
      name: "Kitengela",
      slug: "kitengela",
      color: "#c9a45c",
      imageStyle: "urban-modern",
      baseKeywords: ["houses for rent in Kitengela", "Kitengela rentals", "Acacia Kitengela", "Milimani Kitengela"],
      rentRanges: {
        bedsitter: [7000, 12000],
        oneBedroom: [12000, 18000],
        twoBedroom: [20000, 30000],
        threeBedroom: [35000, 50000],
        maisonette: [50000, 100000]
      },
      estates: ["Acacia", "Milimani", "Yukos", "Chuna", "Muigai", "Noonkopir", "New Valley", "Royal Finesse"],
      amenities: ["borehole water", "24/7 security", "gated community", "shopping malls", "international schools"],
      commute: "45-60 minutes via Nairobi Expressway",
      uniqueFeatures: ["salt-free water", "open spaces", "affordable luxury", "growing infrastructure"]
    },
    ngong: {
      name: "Ngong",
      slug: "ngong",
      color: "#c9a45c",
      imageStyle: "serene-nature",
      baseKeywords: ["houses for rent in Ngong", "Ngong rentals", "Ngong Vet", "Matasia Ngong"],
      rentRanges: {
        bedsitter: [9500, 15000],
        oneBedroom: [15000, 25000],
        twoBedroom: [26000, 40000],
        threeBedroom: [35000, 60000],
        maisonette: [65000, 150000]
      },
      estates: ["Ngong Vet", "Matasia", "Kibiko", "Ngong View", "Kerarapon", "Juanco", "Zambia"],
      amenities: ["Ngong Hills view", "cool climate", "SGR station", "quiet environment", "international schools"],
      commute: "45-60 minutes via Ngong Road",
      uniqueFeatures: ["scenic views", "tranquil living", "cooler temperatures", "mountain proximity"]
    },
    syokimau: {
      name: "Syokimau",
      slug: "syokimau",
      color: "#c9a45c",
      imageStyle: "urban-growth",
      baseKeywords:  ["Katani", "Gateway Mall area", "Greatwall estate", "Lukenya", "Kwa Jomvu", "Syokimau Heights"],
      rentRanges: {
        bedsitter: [8000, 12000],
        oneBedroom: [13000, 20000],
        twoBedroom: [23000, 35000],
        threeBedroom: [45000, 70000],
        maisonette: [100000, 350000]
      },
      estates: ["Kamakis", "Membley", "Tatu City", "Kimbo", "Gwa Kairu", "Kahawa Sukari", "Mwihoko"],
      amenities: ["Thika Road access", "modern infrastructure", "shopping centers", "international schools"],
      commute: "30-45 minutes via Thika Superhighway",
      uniqueFeatures: ["rapid development", "modern estates", "student housing", "premium gated communities"]
    },
    karen: {
      name: "Karen",
      slug: "karen",
      color: "#c9a45c",
      imageStyle: "luxury-estate",
      baseKeywords: ["luxury villas in Karen", "houses for rent in Karen", "Karen rentals", "Miotoni Karen"],
      rentRanges: {
        cottage: [45000, 65000],
        twoBedroom: [60000, 95000],
        threeBedroom: [100000, 200000],
        fourBedroom: [180000, 350000],
        mansion: [350000, 750000]
      },
      estates: ["Miotoni", "Hardy", "Bogani", "Windy Ridge", "Karen Plains", "Kerarapon", "Rhino Park"],
      amenities: ["gated communities", "international schools", "UN approved", "private gardens", "staff quarters"],
      commute: "30-45 minutes via Ngong Road",
      uniqueFeatures: ["leafy suburbs", "ambassadorial homes", "large compounds", "prestigious addresses"]
    },
    kilimani: {
      name: "Kilimani",
      slug: "kilimani",
      color: "#c9a45c",
      imageStyle: "urban-luxury",
      baseKeywords: ["apartments for rent in Kilimani", "Kilimani rentals", "furnished apartments Kilimani"],
      rentRanges: {
        studio: [55000, 75000],
        oneBedroom: [65000, 95000],
        twoBedroom: [85000, 130000],
        threeBedroom: [110000, 185000],
        penthouse: [180000, 350000]
      },
      estates: ["Yaya Centre area", "Argwings Kodhek", "Dennis Pritt", "Lenana Road", "Kindaruma Road"],
      amenities: ["swimming pool", "gym", "backup generator", "high-speed lift", "rooftop terrace"],
      commute: "10-15 minutes to CBD",
      uniqueFeatures: ["urban pulse", "walkable lifestyle", "fine dining", "nightlife"]
    },
    hurlingham: {
      name: "Hurlingham",
      slug: "hurlingham",
      color: "#c9a45c",
      imageStyle: "commercial-luxury",
      baseKeywords: ["apartments for rent in Hurlingham", "Hurlingham rentals", "office space Hurlingham"],
      rentRanges: {
        bedsitter: [19000, 35000],
        oneBedroom: [45000, 70000],
        twoBedroom: [70000, 100000],
        threeBedroom: [85000, 150000],
        office: [80, 120]
      },
      estates: ["Argwings Kodhek", "Timau Road", "Rose Avenue", "Ralph Bunche", "Cotton Avenue"],
      amenities: ["proximity to CBD", "commercial hub", "Yaya Centre", "student housing", "office spaces"],
      commute: "5-10 minutes to CBD",
      uniqueFeatures: ["prime location", "commercial/residential mix", "student friendly", "corporate presence"]
    }
  },
  
  // Blog post templates for different types
  postTemplates: {
    guide: {
      titlePattern: "The Ultimate Guide to {name} Real Estate: {year} Edition",
      descriptionPattern: "Discover everything you need to know about renting in {name}. Complete guide to rent prices, best estates, security, schools, and amenities in {year}.",
      sections: [
        { type: "intro", pattern: "{name} has emerged as one of Nairobi's most sought-after {livingType}, offering a perfect blend of {uniqueFeatures}. Located just {distance} from Nairobi's CBD, this vibrant community has transformed into a bustling residential hub." },
        { type: "why", pattern: "Why {name} is Nairobi's Premier {livingType}" },
        { type: "rentPrices", pattern: "Average Rent Prices in {name} ({year})" },
        { type: "estates", pattern: "Top Estates in {name}" },
        { type: "security", pattern: "Security in {name}" },
        { type: "schools", pattern: "Schools & Educational Institutions" },
        { type: "amenities", pattern: "Shopping & Amenities" },
        { type: "commute", pattern: "Commute to Nairobi" },
        { type: "tips", pattern: "Tips for Renting in {name}" }
      ]
    },
    estate: {
      titlePattern: "{estate}: The Premier {livingType} in {name} You Need to Know",
      descriptionPattern: "Why {estate} is the most sought-after residential area in {name}. Complete guide to {estate} {name} including rent prices, schools, security, and amenities.",
      sections: [
        { type: "intro", pattern: "{estate} has established itself as one of the most desirable residential areas in {name}, offering {uniqueFeatures} that appeal to families and professionals alike." },
        { type: "overview", pattern: "Overview of {estate} {name}" },
        { type: "rentPrices", pattern: "Rent Prices in {estate} {name}" },
        { type: "amenities", pattern: "Amenities & Facilities" },
        { type: "security", pattern: "Security in {estate}" },
        { type: "schools", pattern: "Nearby Schools" },
        { type: "tips", pattern: "Tips for Renting in {estate}" }
      ]
    },
    budget: {
      titlePattern: "Affordable {propertyType} in {name} Under {budget}k",
      descriptionPattern: "Your complete guide to finding spacious, secure {propertyType} in {name} for under KES {budget}. Best areas and tips for budget-conscious renters.",
      sections: [
        { type: "intro", pattern: "Finding quality {propertyType} in {name} doesn't have to break the bank. Here's your guide to affordable options under KES {budget}." },
        { type: "areas", pattern: "Best Areas for {propertyType} Under {budget}k" },
        { type: "features", pattern: "What to Expect at This Price Point" },
        { type: "tips", pattern: "Tips for Finding Affordable Rentals" }
      ]
    },
    comparison: {
      titlePattern: "{name} vs {comparison}: Which Neighborhood Suits Your Lifestyle?",
      descriptionPattern: "Compare two of {name}'s most popular residential areas. Find out where you should rent based on budget, amenities, and lifestyle preferences.",
      sections: [
        { type: "intro", pattern: "Choosing between {estate1} and {estate2} in {name}? This comparison helps you decide based on rent prices, amenities, security, and lifestyle." },
        { type: "comparisonTable", pattern: "Side-by-Side Comparison" },
        { type: "verdict", pattern: "Which Area is Right for You?" }
      ]
    }
  },
  
  // FAQ templates per location
  faqTemplates: {
    kitengela: [
      { q: "What is the average rent for a 3-bedroom house in Kitengela?", a: "In {year}, a standard 3-bedroom bungalow in Kitengela (areas like Acacia or Muigai) ranges between KES 35,000 and KES 50,000. Premium maisonettes in gated communities like Chuna or Royal Finesse can go up to KES 80,000." },
      { q: "Which are the best estates in Kitengela for families?", a: "The most popular family-friendly estates include Acacia Estate, Milimani, Chuna, and New Valley. These areas are preferred for their proximity to top schools like Kitengela International and their secure, gated setups." },
      { q: "Is there reliable water supply in Kitengela rentals?", a: "While Kitengela is historically semi-arid, most modern rentals now feature private boreholes and large storage tanks. When searching for 'houses for rent in Kitengela,' always confirm if the property has a 'freshwater connection' or uses 'borehole water.'" },
      { q: "How long is the commute from Kitengela to Nairobi CBD?", a: "With the Nairobi Expressway and the improved Namanga Road, the commute typically takes 45 to 60 minutes during peak hours. Many residents also use the Kitengela-Nairobi commuter train." }
    ],
    ngong: [
      { q: "What is the average rent for a 1-bedroom apartment in Ngong?", a: "In {year}, a modern 1-bedroom apartment in Ngong Town or Vet ranges from KES 15,000 to KES 25,000. For more executive units in gated courts, prices can reach KES 30,000." },
      { q: "Which are the best estates in Ngong for serene living?", a: "If you are looking for peace and scenic views, Kibiko, Matasia, and Ngong View Estate are the top choices. These areas offer a mix of 3-bedroom bungalows and luxury maisonettes with views of the Ngong Hills." },
      { q: "How is the commute from Ngong to Nairobi CBD?", a: "The commute has significantly improved with the Ngong Road dual carriage. During peak hours, it takes approximately 45 to 60 minutes. Residents also have the option of the SGR from the Ngong Station." }
    ],
    ruiru: [
      { q: "Are there affordable bedsitters for rent in Ruiru?", a: "Yes, Ruiru is a hub for affordable housing. Bedsitters in Kimbo, Gwa Kairu, and Waki typically rent for between KES 8,000 and KES 12,000, making them popular for students and young professionals." },
      { q: "What makes Kamakis a popular residential area in Ruiru?", a: "Kamakis along the Eastern Bypass is highly sought after due to its vibrant social scene, modern 4-bedroom maisonettes, and easy access to both the Thika Superhighway and JKIA." },
      { q: "Is Tatu City a good place to rent for families?", a: "Absolutely. Tatu City offers world-class infrastructure, international schools like Nova Pioneer, and high-end security. Rentals in projects like Unity Homes or Kijani Ridge are ideal for families." }
    ],
    karen: [
      { q: "What is the average rent for a luxury villa in Karen?", a: "In {year}, luxury villas in Karen range from KES 180,000 for a 3-bedroom to over KES 500,000 for 5+ bedroom mansions in exclusive areas like Miotoni and Windy Ridge." },
      { q: "Which are the safest gated communities in Karen?", a: "Miotoni, Hardy, and Windy Ridge are considered the most secure gated communities in Karen, featuring 24/7 security, electric fences, and CCTV surveillance." },
      { q: "Are there furnished apartments available in Karen?", a: "Yes, while Karen is known for standalone homes, there are several managed apartment complexes offering furnished units, particularly near The Hub Karen and Karen Road." }
    ],
    kilimani: [
      { q: "What is the average rent for a furnished apartment in Kilimani?", a: "Furnished 1-bedroom apartments in Kilimani range from KES 65,000 to KES 95,000, while 2-bedroom furnished units go for KES 85,000 to KES 130,000 in prime locations like Yaya Centre area." },
      { q: "Which are the best apartments near Yaya Centre?", a: "Popular apartment buildings near Yaya Centre include The Monarch, Fortis Suites, and Capital Rise, all offering premium amenities like swimming pools, gyms, and 24/7 security." },
      { q: "Is Kilimani a safe area for expatriates?", a: "Yes, Kilimani is one of Nairobi's most expat-friendly neighborhoods with well-lit streets, active community policing, and numerous secure apartment complexes with controlled access." }
    ],
    hurlingham: [
      { q: "What is the average rent for office space in Hurlingham?", a: "Office space in Hurlingham typically rents for KES 80 to KES 120 per square foot per month, with prime locations along Argwings Kodhek Road commanding premium rates." },
      { q: "Are there student-friendly rentals in Hurlingham?", a: "Yes, Hurlingham is popular among students due to its proximity to Daystar University and the Kenya School of Law. Qwetu Hurlingham offers dedicated student accommodation with modern amenities." },
      { q: "What makes Hurlingham ideal for professionals?", a: "Hurlingham's central location, proximity to the CBD, Upper Hill, and excellent transport links make it ideal for professionals. The area also offers a mix of residential and commercial properties." }
    ]
  },
  
  // Image placeholders for each location
  locationImages: {
    kitengela: {
      hero: "/images/blog/kitengela-hero.jpg",
      acacia: "/images/blog/acacia-kitengela.jpg",
      milimani: "/images/blog/milimani-kitengela.jpg",
      bungalow: "/images/blog/kitengela-bungalow.jpg"
    },
    ngong: {
      hero: "/images/blog/ngong-hero.jpg",
      hills: "/images/blog/ngong-hills.jpg",
      vet: "/images/blog/ngong-vet.jpg",
      matasia: "/images/blog/matasia-ngong.jpg"
    },
    ruiru: {
      hero: "/images/blog/ruiru-hero.jpg",
      kamakis: "/images/blog/kamakis-ruiru.jpg",
      tatu: "/images/blog/tatu-city.jpg",
      membley: "/images/blog/membley-ruiru.jpg"
    },
    karen: {
      hero: "/images/blog/karen-hero.jpg",
      villa: "/images/blog/karen-villa.jpg",
      miotoni: "/images/blog/miotoni-karen.jpg",
      hardy: "/images/blog/hardy-karen.jpg"
    },
    kilimani: {
      hero: "/images/blog/kilimani-hero.jpg",
      yaya: "/images/blog/yaya-centre.jpg",
      apartment: "/images/blog/kilimani-apartment.jpg",
      furnished: "/images/blog/furnished-kilimani.jpg"
    },
    hurlingham: {
      hero: "/images/blog/hurlingham-hero.jpg",
      argwings: "/images/blog/argwings-kodhek.jpg",
      office: "/images/blog/hurlingham-office.jpg",
      qwetu: "/images/blog/qwetu-hurlingham.jpg"
    }
  }
};

module.exports = blogConfig;