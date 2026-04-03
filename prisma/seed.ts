import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data (order matters due to FK constraints)
  await prisma.event.deleteMany();
  await prisma.series.deleteMany();
  await prisma.churchOrganiser.deleteMany();
  await prisma.churchAdmin.deleteMany();
  await prisma.serviceTime.deleteMany();
  await prisma.user.deleteMany({ where: { role: { in: ["ORGANISER", "ADMIN"] } } });
  await prisma.church.deleteMany();

  // Create churches
  const grace = await prisma.church.create({
    data: {
      name: "Grace Community Church",
      address: "123 Main St, Austin, TX",
      phone: "(512) 555-0101",
      website: "gracecommunity.org",
      description:
        "Grace Community Church is a vibrant, Spirit-filled congregation dedicated to knowing God and making Him known. We believe in the transforming power of the Gospel and are committed to building a community of faith, hope, and love. Whether you're just starting your faith journey or have walked with God for years, you'll find a welcoming home here.",
      founded: "1998",
      totalEvents: 48,
      serviceTimes: {
        create: [
          { day: "Sunday", time: "9:00 AM - 10:30 AM", type: "Morning Service" },
          { day: "Sunday", time: "11:00 AM - 12:30 PM", type: "Main Service" },
          { day: "Wednesday", time: "7:00 PM - 8:30 PM", type: "Midweek Bible Study" },
        ],
      },
    },
  });

  const newLife = await prisma.church.create({
    data: {
      name: "New Life Fellowship",
      address: "456 Elm Ave, Austin, TX",
      phone: "(512) 555-0182",
      website: "newlifefellowship.org",
      description:
        "New Life Fellowship is a Baptist church rooted in the Word of God and passionate about community transformation. Our mission is to reach the lost, grow the found, and serve the least. We offer ministries for every age and stage of life, from toddlers to seniors.",
      founded: "1985",
      totalEvents: 72,
      serviceTimes: {
        create: [
          { day: "Sunday", time: "8:30 AM - 10:00 AM", type: "Early Service" },
          { day: "Sunday", time: "10:30 AM - 12:00 PM", type: "Main Service" },
          { day: "Friday", time: "6:30 PM - 8:00 PM", type: "Youth Fellowship" },
        ],
      },
    },
  });

  const harvest = await prisma.church.create({
    data: {
      name: "Harvest Church",
      address: "789 Oak Blvd, Austin, TX",
      phone: "(512) 555-0147",
      website: "harvestchurch.com",
      description:
        "Harvest Church is a Pentecostal congregation that believes in the fullness of the Holy Spirit. We worship with passion, preach the Word with boldness, and serve our community with love. Our doors are open to everyone seeking a fresh encounter with God.",
      founded: "2005",
      totalEvents: 35,
      serviceTimes: {
        create: [
          { day: "Sunday", time: "10:00 AM - 11:30 AM", type: "Worship Service" },
          { day: "Thursday", time: "7:30 PM - 9:00 PM", type: "Prayer Night" },
        ],
      },
    },
  });

  const cityLight = await prisma.church.create({
    data: {
      name: "City Light Church",
      address: "321 Pine Rd, Austin, TX",
      phone: "(512) 555-0193",
      website: "citylightchurch.com",
      description:
        "City Light Church is a Presbyterian congregation committed to being a light in the city. We are a community of believers united by grace, shaped by Scripture, and sent into the world to love and serve. We welcome all people to experience the love of Christ with us.",
      founded: "1952",
      totalEvents: 124,
      serviceTimes: {
        create: [
          { day: "Sunday", time: "9:00 AM - 10:30 AM", type: "Traditional Service" },
          { day: "Sunday", time: "11:00 AM - 12:30 PM", type: "Contemporary Service" },
          { day: "Sunday", time: "6:00 PM - 7:30 PM", type: "Evening Service" },
          { day: "Tuesday", time: "7:00 PM - 8:30 PM", type: "Small Groups" },
        ],
      },
    },
  });

  // Create upcoming events
  await prisma.event.create({
    data: {
      datetime: new Date("2025-05-10T19:30"),
      title: "The Cross of Forgiveness",
      location: "St Mary Church",
      host: "Fr Dan Fanous",
      tag: "Bible Study",
      description:
        "Join us for an evening of scripture and reflection as Fr Dan Fanous leads us through the profound mystery of the Cross and what forgiveness truly means in the life of a Christian. All are welcome.",
      isPast: false,
      churchId: grace.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: new Date("2025-05-14T18:30"),
      title: "Youth Fellowship",
      location: "St George Church",
      host: "Fr Mark Mikhail",
      tag: "Youth Meeting",
      description:
        "A Friday night gathering for young adults to connect, worship together, and hear uplifting words from Fr Mark Mikhail. Come with an open heart and bring a friend!",
      isPast: false,
      churchId: newLife.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: new Date("2025-05-15T09:00"),
      title: "Community Outreach",
      location: "Downtown Community Center",
      host: "Deacon Peter",
      tag: "Camp",
      description:
        "Roll up your sleeves and serve alongside Deacon Peter and the wider community. We will be volunteering at the Downtown Community Center — food, fellowship, and making a difference together.",
      isPast: false,
      churchId: harvest.id,
    },
  });

  // Create past events
  await prisma.event.create({
    data: {
      datetime: new Date("2025-03-01T10:00"),
      title: "Sunday Worship Service",
      location: "Grace Community Church",
      host: "Fr Daniel Hanna",
      tag: "Youth Meeting",
      description:
        "A morning of worship, prayer, and the word. Fr Daniel Hanna led the congregation through a powerful reflection on grace and renewal.",
      isPast: true,
      churchId: grace.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: new Date("2025-03-05T19:00"),
      title: "Lenten Prayer Group",
      location: "New Life Fellowship",
      host: "Fr Mark Mikhail",
      tag: "Servants Meeting",
      description:
        "A mid-week gathering during the Lenten season for prayer, fasting reflections, and community support.",
      isPast: true,
      churchId: newLife.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: new Date("2025-03-07T18:30"),
      title: "Youth Bible Study",
      location: "St George Church — Youth Hall",
      host: "Deacon Paul",
      tag: "Bible Study",
      description:
        "Young adults came together to explore the Book of Romans with Deacon Paul. An evening of deep discussion and spiritual growth.",
      isPast: true,
      churchId: cityLight.id,
    },
  });

  // Create organiser users and assign them to specific churches
  const organiser1 = await prisma.user.create({
    data: {
      name: "Alice Organiser",
      email: "organiser1@example.com",
      password: await bcrypt.hash("password123", 10),
      role: "ORGANISER",
    },
  });

  const organiser2 = await prisma.user.create({
    data: {
      name: "Bob Organiser",
      email: "organiser2@example.com",
      password: await bcrypt.hash("password123", 10),
      role: "ORGANISER",
    },
  });

  // organiser1 can manage Grace and New Life
  await prisma.churchOrganiser.createMany({
    data: [
      { userId: organiser1.id, churchId: grace.id },
      { userId: organiser1.id, churchId: newLife.id },
    ],
  });

  // organiser2 can only manage Harvest
  await prisma.churchOrganiser.create({
    data: { userId: organiser2.id, churchId: harvest.id },
  });

  // Create admin user
  const admin1 = await prisma.user.create({
    data: {
      name: "Carol Admin",
      email: "admin@example.com",
      password: await bcrypt.hash("password123", 10),
      role: "ADMIN",
    },
  });

  // admin1 manages Grace Community Church
  await prisma.churchAdmin.create({
    data: { userId: admin1.id, churchId: grace.id },
  });

  console.warn("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
