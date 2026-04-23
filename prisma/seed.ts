import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL environment variable is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function future(days: number, time = "10:00"): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function past(days: number, time = "10:00"): Date {
  return future(-days, time);
}

/** ISO date string (YYYY-MM-DD) for `days` from today. Used in camp metadata. */
function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function main() {
  // Clean up (FK order)
  await prisma.event.deleteMany();
  await prisma.series.deleteMany();
  await prisma.churchOrganiser.deleteMany();
  await prisma.churchAdmin.deleteMany();
  await prisma.serviceTime.deleteMany();
  await prisma.user.deleteMany({
    where: { OR: [{ role: { in: ["ORGANISER", "ADMIN"] } }, { email: "user@example.com" }] },
  });
  await prisma.church.deleteMany();

  // ── Churches ────────────────────────────────────────────────────────────────

  const stMary = await prisma.church.create({
    data: {
      name: "St. Mary & St. Athanasius Coptic Orthodox Church",
      address: "4500 N Shepherd Dr, Houston, TX 77018",
      phone: "(713) 555-0201",
      website: "stmaryhouston.org",
      description:
        "St. Mary & St. Athanasius Coptic Orthodox Church has served the Coptic community in Houston since 1972. Rooted in the ancient Alexandrian tradition, we offer regular Divine Liturgies, Agpeya prayers, Midnight Praise (Tasbeha), and a vibrant youth ministry. Our congregation of over 800 families strives to preserve and live the rich spiritual heritage of the Coptic Church.",
      founded: "1972",
      serviceTimes: {
        create: [
          { day: "Sunday", time: "7:00 AM - 9:30 AM", type: "Divine Liturgy (Arabic)" },
          { day: "Sunday", time: "9:30 AM - 12:00 PM", type: "Divine Liturgy (English/Coptic)" },
          { day: "Friday", time: "10:00 PM - 2:00 AM", type: "Midnight Praise (Tasbeha)" },
          { day: "Wednesday", time: "7:30 PM - 9:00 PM", type: "Bible Study" },
        ],
      },
    },
  });

  const stGeorge = await prisma.church.create({
    data: {
      name: "St. George & St. Rueiss Coptic Orthodox Church",
      address: "2200 Greenville Ave, Dallas, TX 75206",
      phone: "(214) 555-0342",
      website: "stgeorgedallas.org",
      description:
        "St. George & St. Rueiss Coptic Orthodox Church has been a cornerstone of the Coptic community in Dallas since 1985. We are guided by the theology of the School of Alexandria and the martyrdom witness of our patron saints. Our church offers comprehensive pastoral care, a servants formation program, and a strong deaconate.",
      founded: "1985",
      serviceTimes: {
        create: [
          { day: "Sunday", time: "8:00 AM - 11:00 AM", type: "Divine Liturgy" },
          { day: "Saturday", time: "7:00 PM - 9:00 PM", type: "Vespers & Agpeya" },
          { day: "Sunday", time: "6:00 PM - 7:30 PM", type: "Evening Vespers" },
        ],
      },
    },
  });

  const stMark = await prisma.church.create({
    data: {
      name: "St. Mark Coptic Orthodox Church",
      address: "1010 Lamar Blvd, Austin, TX 78703",
      phone: "(512) 555-0478",
      website: "stmarkaustin.org",
      description:
        "St. Mark Coptic Orthodox Church in Austin was established in 1998 to serve the growing Coptic population in central Texas. Named after the founder of the Coptic Church, we carry forward his evangelistic spirit. We are a close-knit congregation with a passionate youth group and an active deaconate.",
      founded: "1998",
      serviceTimes: {
        create: [
          { day: "Sunday", time: "9:00 AM - 12:00 PM", type: "Divine Liturgy" },
          { day: "Friday", time: "10:30 PM - 1:30 AM", type: "Midnight Praise (Tasbeha)" },
          { day: "Thursday", time: "7:00 PM - 8:30 PM", type: "Youth Meeting (Halaqa)" },
        ],
      },
    },
  });

  const archangel = await prisma.church.create({
    data: {
      name: "Archangel Michael & St. Peter Coptic Orthodox Church",
      address: "890 Medical Dr, San Antonio, TX 78229",
      phone: "(210) 555-0519",
      website: "archangelmichael-satx.org",
      description:
        "Archangel Michael & St. Peter Coptic Orthodox Church has grown steadily in San Antonio since its founding in 2005. We honor the Archangel Michael, protector of the Church, and St. Peter the Seal of the Martyrs. Our community is young and energetic, with a focus on family ministry and welcoming those new to the Coptic faith.",
      founded: "2005",
      serviceTimes: {
        create: [
          { day: "Sunday", time: "9:30 AM - 12:30 PM", type: "Divine Liturgy" },
          { day: "Saturday", time: "6:30 PM - 8:00 PM", type: "Agpeya & Vespers" },
        ],
      },
    },
  });

  // ── Series ──────────────────────────────────────────────────────────────────

  const lentSeries = await prisma.series.create({
    data: {
      name: "Lenten Tasbeha Nights",
      description:
        "A weekly Friday night Midnight Praise (Tasbeha) journey through the Great Lent. Each gathering includes the full midnight praises in Coptic, Arabic, and English, with a reflection from Fr. Bishoy Lamie on the spiritual theme of that week.",
      cadence: "WEEKLY",
      location: "Main Hall",
      host: "Fr. Bishoy Lamie",
      tag: "Youth Meeting",
      churchId: stMary.id,
    },
  });

  const youthBibleSeries = await prisma.series.create({
    data: {
      name: "Book of Acts: Youth Bible Series",
      description:
        "A deep dive into the Acts of the Apostles for youth and young adults. Deacon Mina Nashed leads bi-weekly sessions exploring the birth of the early Church, connecting its mission to the Coptic Orthodox witness today.",
      cadence: "BIWEEKLY",
      location: "Youth Hall",
      host: "Deacon Mina Nashed",
      tag: "Bible Study",
      churchId: stMark.id,
    },
  });

  const servantsFormation = await prisma.series.create({
    data: {
      name: "Servants Formation Program",
      description:
        "A monthly gathering for current and aspiring servants of the church. Fr. Antonious Farag covers theological foundations, practical ministry skills, confession guidance, and the spirituality of service. Sessions alternate between lecture and open discussion.",
      cadence: "MONTHLY",
      location: "Conference Room",
      host: "Fr. Antonious Farag",
      tag: "Servants Meeting",
      churchId: stGeorge.id,
    },
  });

  // ── Lenten Tasbeha Series Events (2 past, 2 upcoming) ──────────────────────

  await prisma.event.create({
    data: {
      datetime: past(21, "22:00"),
      title: "Lenten Tasbeha — Week 1: Repentance",
      location: "Main Hall",
      host: "Fr. Bishoy Lamie",
      tag: "Youth Meeting",
      description:
        "The first Tasbeha of Great Lent, focused on the theme of repentance. We chanted the midnight praises in Coptic and Arabic, and Fr. Bishoy reflected on the parable of the Prodigal Son.",
      isPast: true,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stMary.id,
      seriesId: lentSeries.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: past(14, "22:00"),
      title: "Lenten Tasbeha — Week 2: The Cross",
      location: "Main Hall",
      host: "Fr. Bishoy Lamie",
      tag: "Youth Meeting",
      description:
        "Week two of our Lenten Tasbeha journey. Fr. Bishoy meditated on the mystery of the Cross and what it means to bear our own cross daily as followers of Christ.",
      isPast: true,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stMary.id,
      seriesId: lentSeries.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(7, "22:00"),
      title: "Lenten Tasbeha — Week 3: The Resurrection",
      location: "Main Hall",
      host: "Fr. Bishoy Lamie",
      tag: "Youth Meeting",
      description:
        "This week Fr. Bishoy Lamie will guide us through the praises of the Resurrection — Christos Anesti. Come experience the triumphant hope of the risen Christ through the ancient melodies of the Coptic Church.",
      isPast: false,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stMary.id,
      seriesId: lentSeries.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(14, "22:00"),
      title: "Lenten Tasbeha — Week 4: The Ascension",
      location: "Main Hall",
      host: "Fr. Bishoy Lamie",
      tag: "Youth Meeting",
      description:
        "The fourth and final Tasbeha of our Lenten series. Fr. Bishoy will lead us in the praises of the Ascension and close with a reflection on waiting for the coming of the Holy Spirit.",
      isPast: false,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stMary.id,
      seriesId: lentSeries.id,
    },
  });

  // ── Youth Bible Series Events (1 past, 3 upcoming) ─────────────────────────

  await prisma.event.create({
    data: {
      datetime: past(28, "19:00"),
      title: "Book of Acts — Session 1: Pentecost & the Birth of the Church",
      location: "Youth Hall",
      host: "Deacon Mina Nashed",
      tag: "Bible Study",
      description:
        "We opened our series with the outpouring of the Holy Spirit at Pentecost. Deacon Mina walked through Acts 1–2, discussing the apostles' transformation and the Church's first days in Jerusalem.",
      isPast: true,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stMark.id,
      seriesId: youthBibleSeries.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(10, "19:00"),
      title: "Book of Acts — Session 2: Stephen, the First Martyr",
      location: "Youth Hall",
      host: "Deacon Mina Nashed",
      tag: "Bible Study",
      description:
        "Session 2 covers Acts 6–7 and the witness of St. Stephen, the protomartyr. We will explore how his boldness and forgiveness echo the spirit of the Coptic martyrs throughout history.",
      isPast: false,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stMark.id,
      seriesId: youthBibleSeries.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(24, "19:00"),
      title: "Book of Acts — Session 3: Philip & the Ethiopian Eunuch",
      location: "Youth Hall",
      host: "Deacon Mina Nashed",
      tag: "Bible Study",
      description:
        "Acts 8 brings us to one of the most celebrated passages in Coptic history — the baptism of the Ethiopian eunuch, marking the early spread of Christianity to Africa. We will discuss what this means for our own evangelism today.",
      isPast: false,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stMark.id,
      seriesId: youthBibleSeries.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(38, "19:00"),
      title: "Book of Acts — Session 4: St. Paul's Missionary Journeys",
      location: "Youth Hall",
      host: "Deacon Mina Nashed",
      tag: "Bible Study",
      description:
        "We trace St. Paul's first missionary journey through Acts 13–14, examining how the early Church spread the Gospel across the Roman Empire and what we can learn about cross-cultural ministry today.",
      isPast: false,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stMark.id,
      seriesId: youthBibleSeries.id,
    },
  });

  // ── Servants Formation Series Events (1 past, 2 upcoming) ──────────────────

  await prisma.event.create({
    data: {
      datetime: past(35, "18:00"),
      title: "Servants Formation — Month 1: The Theology of Service",
      location: "Conference Room",
      host: "Fr. Antonious Farag",
      tag: "Servants Meeting",
      description:
        "The inaugural session of the Servants Formation Program. Fr. Antonious opened with a theological framework for diakonia — what it means to serve in the Church, rooted in the example of Christ the Servant-King.",
      isPast: true,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stGeorge.id,
      seriesId: servantsFormation.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(8, "18:00"),
      title: "Servants Formation — Month 2: Confession & Spiritual Direction",
      location: "Conference Room",
      host: "Fr. Antonious Farag",
      tag: "Servants Meeting",
      description:
        "This month Fr. Antonious addresses the sacrament of confession from the servant's perspective — how to guide those in your ministry to their confession father, and how a servant's own spiritual life is the foundation of their service.",
      isPast: false,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stGeorge.id,
      seriesId: servantsFormation.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(38, "18:00"),
      title: "Servants Formation — Month 3: Leading Bible Studies",
      location: "Conference Room",
      host: "Fr. Antonious Farag",
      tag: "Servants Meeting",
      description:
        "Session three focuses on practical skills: how to prepare and lead an engaging Bible study, adapt content for different age groups, and handle difficult questions with grace. Includes a hands-on workshop component.",
      isPast: false,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stGeorge.id,
      seriesId: servantsFormation.id,
    },
  });

  // ── Standalone Events ───────────────────────────────────────────────────────

  await prisma.event.create({
    data: {
      datetime: future(5, "07:00"),
      title: "Feast of the Annunciation — Divine Liturgy",
      location: "Sanctuary",
      host: "Fr. Bishoy Lamie",
      tag: "Youth Meeting",
      description:
        "Come celebrate the Feast of the Annunciation with a solemn Divine Liturgy in honor of the Virgin St. Mary. The service will be conducted in Coptic, Arabic, and English. All are welcome.",
      isPast: false,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stMary.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(18, "17:00"),
      title: "New Servants Orientation Evening",
      location: "Main Hall",
      host: "Fr. Antonious Farag",
      tag: "Servants Meeting",
      description:
        "An evening dedicated to welcoming new servants to St. George Church. We will walk through the church's ministry structure, servant responsibilities, and how to get connected. Light dinner provided. All new and prospective servants welcome.",
      isPast: false,
      requiresRegistration: true,
      metadata: { registration: { capacity: 60, collectPhone: true, collectNotes: false } },
      churchId: stGeorge.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: past(12, "19:00"),
      title: "Youth Halaqa: \"Who Is the Holy Spirit?\"",
      location: "Youth Hall",
      host: "Deacon Mina Nashed",
      tag: "Youth Meeting",
      description:
        "A standalone youth halaqa on the Person and work of the Holy Spirit in the life of a Coptic Christian. The session included group discussion, clips from Pope Shenouda III's lectures, and an open Q&A.",
      isPast: true,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stMark.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: past(20, "18:30"),
      title: "Annual Vestry Meeting — St. Mark Church",
      location: "Main Hall",
      host: "Fr. Cyril Mikhail",
      tag: "Servants Meeting",
      description:
        "The annual vestry meeting reviewed the church's financial report, elected new board members, and discussed the renovation project for the baptistry. Minutes are available from the church office.",
      isPast: true,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: stMark.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: past(45, "19:00"),
      title: "\"The Life of St. Moses the Black\" — Evening Lecture",
      location: "Main Hall",
      host: "Dr. Hany Takla",
      tag: "Bible Study",
      description:
        "Dr. Hany Takla of the St. Shenouda Coptic Society delivered a compelling lecture on the life and legacy of St. Moses the Black — from bandit to monk to martyr. His story is a testament to the transforming grace of God and the ascetic tradition of the Desert Fathers.",
      isPast: true,
      metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } },
      churchId: archangel.id,
    },
  });

  // ── Camp Event ──────────────────────────────────────────────────────────────

  const campDay = 32;

  await prisma.event.create({
    data: {
      datetime: future(campDay, "08:00"),
      title: "St. Mary Summer Camp 2026 — \"Called by Name\"",
      location: "Lakeview Christian Retreat Center, Waco, TX",
      host: "Fr. Bishoy Lamie",
      tag: "Camp",
      description:
        "Join us for St. Mary's annual summer camp for youth and young adults (ages 13–22). This year's theme is \"Called by Name\" — exploring our identity in Christ, our vocation, and what it means to be Coptic Orthodox in today's world. Five days of liturgies, talks, workshops, swimming, hiking, and deep community. Registration required. Cost covers lodging and all meals.",
      isPast: false,
      requiresRegistration: true,
      price: "$175",
      metadata: {
        registration: {
          capacity: 120,
          collectPhone: true,
          collectNotes: true,
        },
        camp: {
          endDate: futureDate(campDay + 4),
          allowPartialRegistration: true,
          agenda: [
            {
              id: "day1-arrive",
              date: futureDate(campDay),
              time: "8:00 AM",
              title: "Arrival & Registration",
              description: "Check in, settle into cabins, and meet your camp family.",
            },
            {
              id: "day1-liturgy",
              date: futureDate(campDay),
              time: "10:00 AM",
              title: "Opening Divine Liturgy",
              description: "We begin our camp week with a solemn Divine Liturgy celebrated by Fr. Bishoy Lamie.",
            },
            {
              id: "day1-games",
              date: futureDate(campDay),
              time: "3:00 PM",
              title: "Team Building & Welcome Games",
              description: "Get to know your fellow campers with outdoor team-building activities.",
            },
            {
              id: "day1-vespers",
              date: futureDate(campDay),
              time: "8:00 PM",
              title: "Evening Vespers & Theme Introduction",
              description: "Evening prayer followed by an introduction to the camp theme \"Called by Name.\"",
            },
            {
              id: "day2-agpeya",
              date: futureDate(campDay + 1),
              time: "6:30 AM",
              title: "Morning Agpeya",
              description: "Start the day with the Third and Sixth Hour prayers of the Agpeya.",
            },
            {
              id: "day2-talk1",
              date: futureDate(campDay + 1),
              time: "9:00 AM",
              title: "Talk 1: \"Who Am I?\" — Identity in Christ",
              description:
                "Fr. Bishoy opens our theological journey by exploring what Scripture and the Church Fathers say about our identity as children of God.",
            },
            {
              id: "day2-workshop1",
              date: futureDate(campDay + 1),
              time: "11:30 AM",
              title: "Workshop: Icons & the Theology of Beauty",
              description:
                "A hands-on workshop exploring Coptic iconography and what it tells us about the Kingdom of Heaven.",
            },
            {
              id: "day2-recreation",
              date: futureDate(campDay + 1),
              time: "3:00 PM",
              title: "Swimming & Recreation",
              description: "Free time at the lake — swimming, kayaking, and outdoor games.",
            },
            {
              id: "day2-praise",
              date: futureDate(campDay + 1),
              time: "8:00 PM",
              title: "Evening Praise (Tasbeha)",
              description: "Youth-led Tasbeha night — a joyful evening of Coptic hymns and praise.",
            },
            {
              id: "day3-liturgy",
              date: futureDate(campDay + 2),
              time: "6:30 AM",
              title: "Sunday Divine Liturgy",
              description: "The centerpiece of our week — a full Sunday Liturgy in the Bright Season tunes.",
            },
            {
              id: "day3-talk2",
              date: futureDate(campDay + 2),
              time: "10:30 AM",
              title: "Talk 2: \"What Is My Vocation?\" — Called to Serve",
              description:
                "Exploring the different vocations in the Church — monasticism, marriage, deaconate, and lay service — and how to discern your calling.",
            },
            {
              id: "day3-workshop2",
              date: futureDate(campDay + 2),
              time: "2:00 PM",
              title: "Workshop: The Agpeya & Daily Prayer",
              description:
                "Learn the structure and spirituality of the Agpeya (Coptic Book of Hours) and how to build a daily prayer rule.",
            },
            {
              id: "day3-talent",
              date: futureDate(campDay + 2),
              time: "7:00 PM",
              title: "Talent Show Night",
              description: "An evening of music, skits, and creativity showcasing the talents of our camp community.",
            },
            {
              id: "day4-agpeya",
              date: futureDate(campDay + 3),
              time: "6:30 AM",
              title: "Morning Agpeya",
              description: "Morning prayers to begin the penultimate day of camp.",
            },
            {
              id: "day4-talk3",
              date: futureDate(campDay + 3),
              time: "9:00 AM",
              title: "Talk 3: \"Living Coptic in the West\" — Faith & Culture",
              description:
                "A panel discussion with young Coptic professionals on navigating faith, identity, and culture as Copts in the diaspora.",
            },
            {
              id: "day4-hike",
              date: futureDate(campDay + 3),
              time: "1:00 PM",
              title: "Guided Nature Hike",
              description:
                "A three-mile hike through the Bosque River trail, concluding with a reflection on creation and the Desert Fathers.",
            },
            {
              id: "day4-campfire",
              date: futureDate(campDay + 3),
              time: "8:00 PM",
              title: "Campfire & Testimonies",
              description: "An intimate campfire gathering where campers share their stories of encountering God during the week.",
            },
            {
              id: "day5-liturgy",
              date: futureDate(campDay + 4),
              time: "6:30 AM",
              title: "Closing Divine Liturgy",
              description: "We close our camp week with a Divine Liturgy and renewal of baptismal commitments.",
            },
            {
              id: "day5-reflection",
              date: futureDate(campDay + 4),
              time: "10:30 AM",
              title: "Final Reflection & Sending",
              description:
                "Fr. Bishoy leads the closing session with camper testimonies, a charge for the year ahead, and prayers of blessing.",
            },
            {
              id: "day5-depart",
              date: futureDate(campDay + 4),
              time: "1:00 PM",
              title: "Departure",
              description: "Safe travels home. May God keep you until we meet again.",
            },
          ],
        },
      },
      churchId: stMary.id,
    },
  });

  // ── Users ────────────────────────────────────────────────────────────────────

  const organiser1 = await prisma.user.create({
    data: {
      name: "Fr. Bishoy Lamie",
      email: "organiser1@example.com",
      password: await bcrypt.hash("password123", 10),
      emailVerified: new Date(),
      onboardingCompleted: true,
      role: "ORGANISER",
    },
  });

  const organiser2 = await prisma.user.create({
    data: {
      name: "Deacon Mina Nashed",
      email: "organiser2@example.com",
      password: await bcrypt.hash("password123", 10),
      emailVerified: new Date(),
      onboardingCompleted: true,
      role: "ORGANISER",
    },
  });

  const organiser3 = await prisma.user.create({
    data: {
      name: "Fr. Antonious Farag",
      email: "organiser3@example.com",
      password: await bcrypt.hash("password123", 10),
      emailVerified: new Date(),
      onboardingCompleted: true,
      role: "ORGANISER",
    },
  });

  await prisma.churchOrganiser.create({ data: { userId: organiser1.id, churchId: stMary.id } });
  await prisma.churchOrganiser.create({ data: { userId: organiser2.id, churchId: stMark.id } });
  await prisma.churchOrganiser.create({ data: { userId: organiser3.id, churchId: stGeorge.id } });

  const admin1 = await prisma.user.create({
    data: {
      name: "Carol Admin",
      email: "admin@example.com",
      password: await bcrypt.hash("password123", 10),
      emailVerified: new Date(),
      onboardingCompleted: true,
      role: "ADMIN",
    },
  });

  await prisma.churchAdmin.create({ data: { userId: admin1.id, churchId: stMary.id } });

  await prisma.user.create({
    data: {
      name: "Mark Girgis",
      email: "user@example.com",
      password: await bcrypt.hash("password123", 10),
      emailVerified: new Date(),
      onboardingCompleted: true,
      role: "ATTENDEE",
    },
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
