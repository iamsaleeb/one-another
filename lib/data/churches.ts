import { type Event, events } from "./events";

export interface ServiceTime {
  day: string;
  time: string;
  type: string;
}

export interface Church {
  id: number;
  name: string;
  denomination: string;
  address: string;
  phone: string;
  website: string;
  description: string;
  founded: string;
  members: number;
  followers: number;
  totalEvents: number;
  serviceTimes: ServiceTime[];
  eventIds: number[];
}

export const churches: Church[] = [
  {
    id: 1,
    name: "Grace Community Church",
    denomination: "Non-denominational",
    address: "123 Main St, Austin, TX",
    phone: "(512) 555-0101",
    website: "gracecommunity.org",
    description:
      "Grace Community Church is a vibrant, Spirit-filled congregation dedicated to knowing God and making Him known. We believe in the transforming power of the Gospel and are committed to building a community of faith, hope, and love. Whether you're just starting your faith journey or have walked with God for years, you'll find a welcoming home here.",
    founded: "1998",
    members: 850,
    followers: 1240,
    totalEvents: 48,
    serviceTimes: [
      { day: "Sunday", time: "9:00 AM", type: "Morning Service" },
      { day: "Sunday", time: "11:00 AM", type: "Main Service" },
      { day: "Wednesday", time: "7:00 PM", type: "Midweek Bible Study" },
    ],
    eventIds: [1, 3],
  },
  {
    id: 2,
    name: "New Life Fellowship",
    denomination: "Baptist",
    address: "456 Elm Ave, Austin, TX",
    phone: "(512) 555-0182",
    website: "newlifefellowship.org",
    description:
      "New Life Fellowship is a Baptist church rooted in the Word of God and passionate about community transformation. Our mission is to reach the lost, grow the found, and serve the least. We offer ministries for every age and stage of life, from toddlers to seniors.",
    founded: "1985",
    members: 1200,
    followers: 2100,
    totalEvents: 72,
    serviceTimes: [
      { day: "Sunday", time: "8:30 AM", type: "Early Service" },
      { day: "Sunday", time: "10:30 AM", type: "Main Service" },
      { day: "Friday", time: "6:30 PM", type: "Youth Fellowship" },
    ],
    eventIds: [2],
  },
  {
    id: 3,
    name: "Harvest Church",
    denomination: "Pentecostal",
    address: "789 Oak Blvd, Austin, TX",
    phone: "(512) 555-0147",
    website: "harvestchurch.com",
    description:
      "Harvest Church is a Pentecostal congregation that believes in the fullness of the Holy Spirit. We worship with passion, preach the Word with boldness, and serve our community with love. Our doors are open to everyone seeking a fresh encounter with God.",
    founded: "2005",
    members: 620,
    followers: 980,
    totalEvents: 35,
    serviceTimes: [
      { day: "Sunday", time: "10:00 AM", type: "Worship Service" },
      { day: "Thursday", time: "7:30 PM", type: "Prayer Night" },
    ],
    eventIds: [3],
  },
  {
    id: 4,
    name: "City Light Church",
    denomination: "Presbyterian",
    address: "321 Pine Rd, Austin, TX",
    phone: "(512) 555-0193",
    website: "citylightchurch.com",
    description:
      "City Light Church is a Presbyterian congregation committed to being a light in the city. We are a community of believers united by grace, shaped by Scripture, and sent into the world to love and serve. We welcome all people to experience the love of Christ with us.",
    founded: "1952",
    members: 2400,
    followers: 3800,
    totalEvents: 124,
    serviceTimes: [
      { day: "Sunday", time: "9:00 AM", type: "Traditional Service" },
      { day: "Sunday", time: "11:00 AM", type: "Contemporary Service" },
      { day: "Sunday", time: "6:00 PM", type: "Evening Service" },
      { day: "Tuesday", time: "7:00 PM", type: "Small Groups" },
    ],
    eventIds: [1, 2, 3],
  },
];

export function getChurchEvents(church: Church): Event[] {
  return church.eventIds.map((id) => events.find((e) => e.id === id)).filter((e): e is Event => e !== undefined);
}
