import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("DATABASE_URL environment variable is not set");
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

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function main() {
  // Clean up (FK order)
  await prisma.eventAttendeeResponse.deleteMany();
  await prisma.eventAttendee.deleteMany();
  await prisma.eventQuestion.deleteMany();
  await prisma.questionLibraryItem.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.seriesFollower.deleteMany();
  await prisma.churchFollower.deleteMany();
  await prisma.savedEvent.deleteMany();
  await prisma.seriesStaffAssignment.deleteMany();
  await prisma.eventStaffAssignment.deleteMany();
  await prisma.event.deleteMany();
  await prisma.series.deleteMany();
  await prisma.churchMembership.deleteMany();
  await prisma.platformRoleAssignment.deleteMany();
  await prisma.serviceTime.deleteMany();
  await prisma.user.deleteMany();
  await prisma.church.deleteMany();

  // ── Churches ─────────────────────────────────────────────────────────────────

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
          { day: "SUNDAY", time: "7:00 AM – 9:30 AM", type: "MORNING" },
          { day: "SUNDAY", time: "9:30 AM – 12:00 PM", type: "MORNING" },
          { day: "FRIDAY", time: "10:00 PM – 2:00 AM", type: "OTHER" },
          { day: "WEDNESDAY", time: "7:30 PM – 9:00 PM", type: "MIDWEEK" },
          { day: "SATURDAY", time: "6:00 PM – 7:30 PM", type: "EVENING" },
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
          { day: "SUNDAY", time: "8:00 AM – 11:00 AM", type: "MORNING" },
          { day: "SATURDAY", time: "7:00 PM – 9:00 PM", type: "EVENING" },
          { day: "SUNDAY", time: "6:00 PM – 7:30 PM", type: "EVENING" },
          { day: "WEDNESDAY", time: "7:00 PM – 8:30 PM", type: "MIDWEEK" },
          { day: "FRIDAY", time: "9:30 PM – 1:00 AM", type: "OTHER" },
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
          { day: "SUNDAY", time: "9:00 AM – 12:00 PM", type: "MORNING" },
          { day: "FRIDAY", time: "10:30 PM – 1:30 AM", type: "OTHER" },
          { day: "THURSDAY", time: "7:00 PM – 8:30 PM", type: "YOUTH" },
          { day: "TUESDAY", time: "7:00 PM – 8:30 PM", type: "MIDWEEK" },
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
          { day: "SUNDAY", time: "9:30 AM – 12:30 PM", type: "MORNING" },
          { day: "SATURDAY", time: "6:30 PM – 8:00 PM", type: "EVENING" },
          { day: "WEDNESDAY", time: "7:00 PM – 8:30 PM", type: "MIDWEEK" },
        ],
      },
    },
  });

  const stPishoy = await prisma.church.create({
    data: {
      name: "St. Pishoy & St. Bishoy Coptic Orthodox Church",
      address: "3200 Timberloch Pl, The Woodlands, TX 77380",
      phone: "(832) 555-0633",
      website: "stpishoy-woodlands.org",
      description:
        "St. Pishoy & St. Bishoy Coptic Orthodox Church was established in 2010 to serve the rapidly growing Coptic community in The Woodlands and surrounding suburbs north of Houston. We draw inspiration from the monastic witness of our patron saints, Abba Pishoy and Abba Bishoy of Wadi El Natrun. We offer a rich liturgical life, a Coptic language program, and a growing Desert Fathers reading community.",
      founded: "2010",
      serviceTimes: {
        create: [
          { day: "SUNDAY", time: "8:30 AM – 11:30 AM", type: "MORNING" },
          { day: "FRIDAY", time: "9:00 PM – 12:00 AM", type: "OTHER" },
          { day: "SATURDAY", time: "5:00 PM – 6:30 PM", type: "EVENING" },
          { day: "MONDAY", time: "7:00 PM – 8:30 PM", type: "MIDWEEK" },
        ],
      },
    },
  });

  const stAnthony = await prisma.church.create({
    data: {
      name: "St. Anthony & St. Paul Coptic Orthodox Church",
      address: "5500 Boat Club Rd, Fort Worth, TX 76135",
      phone: "(817) 555-0744",
      website: "stanthony-fw.org",
      description:
        "St. Anthony & St. Paul Coptic Orthodox Church was founded in 2015 in Fort Worth, bringing the Coptic Orthodox faith to the western DFW metroplex. Named after the two great fathers of Christian monasticism, we aspire to a contemplative and rooted parish life. Our congregation includes many young families drawn by our strong Sunday School program and welcoming pastoral care.",
      founded: "2015",
      serviceTimes: {
        create: [
          { day: "SUNDAY", time: "9:00 AM – 12:00 PM", type: "MORNING" },
          { day: "SUNDAY", time: "6:00 PM – 7:30 PM", type: "EVENING" },
          { day: "THURSDAY", time: "7:00 PM – 9:00 PM", type: "YOUTH" },
          { day: "SATURDAY", time: "6:00 PM – 7:30 PM", type: "EVENING" },
        ],
      },
    },
  });

  // ── Series ────────────────────────────────────────────────────────────────────

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

  const sundaySchoolTraining = await prisma.series.create({
    data: {
      name: "Sunday School Teacher Training",
      description:
        "A monthly training series for Sunday School teachers at St. Mary Church. Topics include child theology, age-appropriate lesson planning, classroom management, and spiritual formation of young servants. Led by the Sunday School committee with occasional guest speakers.",
      cadence: "MONTHLY",
      location: "Education Wing",
      host: "Maryam Iskander",
      tag: "Servants Meeting",
      churchId: stMary.id,
    },
  });

  const marriagePrep = await prisma.series.create({
    data: {
      name: "Marriage Preparation Course",
      description:
        "A comprehensive bi-weekly marriage preparation course for engaged couples at St. George Church. Fr. Antonious Farag and Dr. Nadia Habib walk couples through the theology of Coptic marriage, communication, finances, family planning, and the sacramental life of a Christian household.",
      cadence: "BIWEEKLY",
      location: "Conference Room",
      host: "Fr. Antonious Farag & Dr. Nadia Habib",
      tag: "Parish Meeting",
      churchId: stGeorge.id,
    },
  });

  const desertFathers = await prisma.series.create({
    data: {
      name: "Desert Fathers Reading Group",
      description:
        "A monthly reading and discussion group at St. Pishoy Church exploring the writings of the Desert Fathers — the Sayings of the Fathers (Apophthegmata Patrum), the writings of St. Antony, St. Macarius, and Abba Isaiah. Open to all adults seeking to deepen their contemplative life.",
      cadence: "MONTHLY",
      location: "Library Room",
      host: "Fr. Demetrius Botros",
      tag: "Bible Study",
      churchId: stPishoy.id,
    },
  });

  const copticLanguage = await prisma.series.create({
    data: {
      name: "Coptic Language Class — Beginner Level",
      description:
        "A weekly Coptic language course at St. Pishoy Church for beginners. Students learn the Coptic alphabet, basic vocabulary, liturgical phrases, and the pronunciation of common hymns and responses. Taught by Cantor George Mikhail, a Coptic language instructor with 15 years of experience.",
      cadence: "WEEKLY",
      location: "Classroom B",
      host: "Cantor George Mikhail",
      tag: "Parish Meeting",
      churchId: stPishoy.id,
    },
  });

  const youngAdults = await prisma.series.create({
    data: {
      name: "Young Adults Fellowship",
      description:
        "A bi-weekly gathering for young adults (ages 21–35) at St. Mark Church. Each session begins with a shared meal, followed by a discussion on faith, vocation, relationships, and what it means to live as a Coptic Christian in contemporary Austin. Facilitated by Deacon Mina Nashed.",
      cadence: "BIWEEKLY",
      location: "Fellowship Hall",
      host: "Deacon Mina Nashed",
      tag: "Young Adults",
      churchId: stMark.id,
    },
  });

  const parishPastoral = await prisma.series.create({
    data: {
      name: "Parish Pastoral Talks",
      description:
        "A monthly pastoral talk series at St. Anthony & St. Paul Church for the whole congregation. Fr. Marcos Khalil addresses one key topic per month — confession, prayer, fasting, marriage, raising children in faith — drawing on Scripture, the Fathers, and the lived experience of the parish.",
      cadence: "MONTHLY",
      location: "Main Hall",
      host: "Fr. Marcos Khalil",
      tag: "Parish Meeting",
      churchId: stAnthony.id,
    },
  });

  // ── Lenten Tasbeha Series Events ──────────────────────────────────────────────

  await prisma.event.create({
    data: {
      datetime: past(21, "22:00"),
      title: "Lenten Tasbeha — Week 1: Repentance",
      location: "Main Hall",
      host: "Fr. Bishoy Lamie",
      tag: "Youth Meeting",
      description:
        "The first Tasbeha of Great Lent, focused on the theme of repentance. We chanted the midnight praises in Coptic and Arabic, and Fr. Bishoy reflected on the parable of the Prodigal Son.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
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
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
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
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
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
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMary.id,
      seriesId: lentSeries.id,
    },
  });

  // ── Book of Acts Events ───────────────────────────────────────────────────────

  await prisma.event.create({
    data: {
      datetime: past(28, "19:00"),
      title: "Book of Acts — Session 1: Pentecost & the Birth of the Church",
      location: "Youth Hall",
      host: "Deacon Mina Nashed",
      tag: "Bible Study",
      description:
        "We opened our series with the outpouring of the Holy Spirit at Pentecost. Deacon Mina walked through Acts 1–2, discussing the apostles' transformation and the Church's first days in Jerusalem.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
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
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
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
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMark.id,
      seriesId: youthBibleSeries.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(38, "19:00"),
      title: "Book of Acts — Session 4: St. Paul's First Missionary Journey",
      location: "Youth Hall",
      host: "Deacon Mina Nashed",
      tag: "Bible Study",
      description:
        "We trace St. Paul's first missionary journey through Acts 13–14, examining how the early Church spread the Gospel across the Roman Empire and what we can learn about cross-cultural ministry today.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMark.id,
      seriesId: youthBibleSeries.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(52, "19:00"),
      title: "Book of Acts — Session 5: The Jerusalem Council",
      location: "Youth Hall",
      host: "Deacon Mina Nashed",
      tag: "Bible Study",
      description:
        "Acts 15 and the first church council. We examine how the early Church resolved doctrinal conflict, the role of tradition and Scripture in discernment, and what this means for the Coptic Church's conciliar identity.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMark.id,
      seriesId: youthBibleSeries.id,
    },
  });

  // ── Servants Formation Events ─────────────────────────────────────────────────

  await prisma.event.create({
    data: {
      datetime: past(35, "18:00"),
      title: "Servants Formation — Month 1: The Theology of Service",
      location: "Conference Room",
      host: "Fr. Antonious Farag",
      tag: "Servants Meeting",
      description:
        "The inaugural session of the Servants Formation Program. Fr. Antonious opened with a theological framework for diakonia — what it means to serve in the Church, rooted in the example of Christ the Servant-King.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
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
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
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
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stGeorge.id,
      seriesId: servantsFormation.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(68, "18:00"),
      title: "Servants Formation — Month 4: Youth Ministry in Practice",
      location: "Conference Room",
      host: "Fr. Antonious Farag",
      tag: "Servants Meeting",
      description:
        "A practical session on youth ministry — understanding the developmental stages of teenagers, building trust, handling crises, and creating safe spaces for young people to encounter Christ. Includes case study discussions.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stGeorge.id,
      seriesId: servantsFormation.id,
    },
  });

  // ── Sunday School Teacher Training Events ────────────────────────────────────

  await prisma.event.create({
    data: {
      datetime: past(63, "10:00"),
      title:
        "Sunday School Training — Session 1: Foundations of Coptic Pedagogy",
      location: "Education Wing",
      host: "Maryam Iskander",
      tag: "Servants Meeting",
      description:
        "The opening session of our teacher training year. Maryam Iskander introduced the principles of Coptic Christian pedagogy — how our faith tradition understands childhood, formation, and the role of the Sunday School servant as a spiritual parent.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMary.id,
      seriesId: sundaySchoolTraining.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: past(28, "10:00"),
      title:
        "Sunday School Training — Session 2: Age-Appropriate Lesson Planning",
      location: "Education Wing",
      host: "Maryam Iskander",
      tag: "Servants Meeting",
      description:
        "Practical session on adapting theological content for different age groups — from kindergarteners to teenagers. Teachers worked in small groups to redesign a sample lesson on the Eucharist for their specific age bracket.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMary.id,
      seriesId: sundaySchoolTraining.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(15, "10:00"),
      title:
        "Sunday School Training — Session 3: Classroom Management & Discipline",
      location: "Education Wing",
      host: "Maryam Iskander",
      tag: "Servants Meeting",
      description:
        "How to maintain a prayerful, focused classroom environment while remaining compassionate and patient. Topics include setting expectations, de-escalation techniques, and engaging restless learners. Guest speaker: Dr. Christine Soliman, educational psychologist.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMary.id,
      seriesId: sundaySchoolTraining.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(45, "10:00"),
      title:
        "Sunday School Training — Session 4: Storytelling & the Church Fathers",
      location: "Education Wing",
      host: "Maryam Iskander",
      tag: "Servants Meeting",
      description:
        "Exploring the power of narrative in faith formation. We examine how the early Church used storytelling — saints' lives, scripture narratives, and parables — and practice bringing these stories alive for children today.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMary.id,
      seriesId: sundaySchoolTraining.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(75, "10:00"),
      title:
        "Sunday School Training — Session 5: Parent Engagement & Communication",
      location: "Education Wing",
      host: "Maryam Iskander",
      tag: "Servants Meeting",
      description:
        "The final session of the year covers building strong partnerships with parents, navigating sensitive conversations, and aligning home and church formation. Includes a panel of parents sharing what they most need from Sunday School servants.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMary.id,
      seriesId: sundaySchoolTraining.id,
    },
  });

  // ── Marriage Preparation Course Events ───────────────────────────────────────

  await prisma.event.create({
    data: {
      datetime: past(42, "18:30"),
      title: "Marriage Prep — Session 1: The Theology of Coptic Marriage",
      location: "Conference Room",
      host: "Fr. Antonious Farag",
      tag: "Parish Meeting",
      description:
        "The first session established the theological foundation — marriage as a sacrament, the roles of husband and wife in the Coptic tradition, and the eschatological dimension of Christian matrimony. Fr. Antonious walked through the wedding liturgy and its hidden depths.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stGeorge.id,
      seriesId: marriagePrep.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(6, "18:30"),
      title: "Marriage Prep — Session 2: Communication & Conflict",
      location: "Conference Room",
      host: "Dr. Nadia Habib",
      tag: "Parish Meeting",
      description:
        "Dr. Nadia Habib leads this session on the dynamics of healthy communication in marriage — listening deeply, expressing needs clearly, and navigating conflict without contempt. Includes practical exercises for couples to try at home.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stGeorge.id,
      seriesId: marriagePrep.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(20, "18:30"),
      title: "Marriage Prep — Session 3: Finances & Shared Life",
      location: "Conference Room",
      host: "Fr. Antonious Farag & Dr. Nadia Habib",
      tag: "Parish Meeting",
      description:
        "A joint session on the practical side of shared life — budgeting, debt, financial goals, and how to make decisions together. Fr. Antonious opens with a reflection on stewardship and generosity as spiritual disciplines for married couples.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stGeorge.id,
      seriesId: marriagePrep.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(34, "18:30"),
      title:
        "Marriage Prep — Session 4: Family Planning & Raising Children in Faith",
      location: "Conference Room",
      host: "Fr. Antonious Farag",
      tag: "Parish Meeting",
      description:
        "An open discussion on family planning from a Coptic perspective, followed by a panel of parents from St. George sharing how they raise children in the faith — from baptism and chrismation through teenage years.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stGeorge.id,
      seriesId: marriagePrep.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(48, "18:30"),
      title: "Marriage Prep — Session 5: The Sacramental Life of the Home",
      location: "Conference Room",
      host: "Fr. Antonious Farag",
      tag: "Parish Meeting",
      description:
        "The closing session brings everything together — confession, communion, fasting, prayer, and how the rhythms of the Coptic calendar shape a Christian home. Culminates in a blessing prayer for all the couples completing the course.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stGeorge.id,
      seriesId: marriagePrep.id,
    },
  });

  // ── Desert Fathers Reading Group Events ──────────────────────────────────────

  await prisma.event.create({
    data: {
      datetime: past(56, "19:00"),
      title: "Desert Fathers — Month 1: The Sayings of Abba Anthony",
      location: "Library Room",
      host: "Fr. Demetrius Botros",
      tag: "Bible Study",
      description:
        "We began our journey with the most celebrated of the Desert Fathers — St. Anthony the Great. Fr. Demetrius guided us through selected sayings from the Apophthegmata, focusing on Anthony's teachings on discernment, solitude, and the warfare of thoughts.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stPishoy.id,
      seriesId: desertFathers.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: past(14, "19:00"),
      title: "Desert Fathers — Month 2: Abba Macarius & the Life of Scetis",
      location: "Library Room",
      host: "Fr. Demetrius Botros",
      tag: "Bible Study",
      description:
        "This session explored the Scetis desert community through the life and sayings of Abba Macarius the Great. We read selections from the Macarian homilies and discussed how his vision of the heart as a battlefield applies to modern spiritual life.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stPishoy.id,
      seriesId: desertFathers.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(16, "19:00"),
      title: "Desert Fathers — Month 3: Abba Pishoy & the Monastic Ideal",
      location: "Library Room",
      host: "Fr. Demetrius Botros",
      tag: "Bible Study",
      description:
        "A fitting session for our community — we turn to Abba Pishoy himself, our patron saint. Fr. Demetrius will lead a reading of the Doxology of St. Pishoy alongside selections from his monastic rule, exploring what radical surrender to God looks like in any age.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stPishoy.id,
      seriesId: desertFathers.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(46, "19:00"),
      title: "Desert Fathers — Month 4: The Sayings of the Mothers (Ammas)",
      location: "Library Room",
      host: "Fr. Demetrius Botros",
      tag: "Bible Study",
      description:
        "Often overlooked, the Desert Mothers — Amma Syncletica, Amma Theodora, Amma Sarah — offer profound wisdom on humility, perseverance, and the interior life. This session recovers their voices as essential guides for contemporary Christians.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stPishoy.id,
      seriesId: desertFathers.id,
    },
  });

  // ── Coptic Language Class Events ──────────────────────────────────────────────

  await prisma.event.create({
    data: {
      datetime: past(63, "18:00"),
      title: "Coptic Language — Class 1: The Alphabet & Phonology",
      location: "Classroom B",
      host: "Cantor George Mikhail",
      tag: "Parish Meeting",
      description:
        "Our first class introduced the Coptic alphabet (Bohairic dialect) — its 32 letters, their Coptic and Greek origins, and the unique sounds of the language. Students learned to read their names in Coptic script.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stPishoy.id,
      seriesId: copticLanguage.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: past(42, "18:00"),
      title: "Coptic Language — Class 2: Liturgical Responses",
      location: "Classroom B",
      host: "Cantor George Mikhail",
      tag: "Parish Meeting",
      description:
        "Students began learning the most common liturgical responses — Pi-epnevma, Axios, Kyrie Eleison — their meaning, pronunciation, and context in the Divine Liturgy. We also covered basic grammar patterns.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stPishoy.id,
      seriesId: copticLanguage.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: past(21, "18:00"),
      title: "Coptic Language — Class 3: The Lord's Prayer in Coptic",
      location: "Classroom B",
      host: "Cantor George Mikhail",
      tag: "Parish Meeting",
      description:
        "This class centered on the Lord's Prayer (Ti-eprosevkhi) — learning it word by word, parsing its vocabulary, and memorizing it as a living prayer. Students also practiced the Coptic numbers 1–20.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stPishoy.id,
      seriesId: copticLanguage.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(7, "18:00"),
      title: "Coptic Language — Class 4: Hymn Study — Pi-Oik",
      location: "Classroom B",
      host: "Cantor George Mikhail",
      tag: "Parish Meeting",
      description:
        "A deep dive into the hymn Pi-Oik Ente Pivot — Bread of the Father. Students will parse each line, learn the vocabulary, and practice singing it in Bohairic. Cantor George will explain the hymn's theological content and its place in the liturgy.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stPishoy.id,
      seriesId: copticLanguage.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(21, "18:00"),
      title: "Coptic Language — Class 5: Verbs & Tenses",
      location: "Classroom B",
      host: "Cantor George Mikhail",
      tag: "Parish Meeting",
      description:
        "An introduction to Coptic verb structure — the present, future, and imperative tenses. We focus on verbs that appear frequently in liturgy and scripture, giving students a grammatical foundation for reading simple Coptic texts.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stPishoy.id,
      seriesId: copticLanguage.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(35, "18:00"),
      title: "Coptic Language — Class 6: Reading the Agpeya",
      location: "Classroom B",
      host: "Cantor George Mikhail",
      tag: "Parish Meeting",
      description:
        "Students will read the Third Hour prayer of the Agpeya directly from the Coptic text, supported by an interlinear translation. The goal is to experience the Agpeya in its original language for the first time.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stPishoy.id,
      seriesId: copticLanguage.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(49, "18:00"),
      title: "Coptic Language — Class 7: Doxologies of the Saints",
      location: "Classroom B",
      host: "Cantor George Mikhail",
      tag: "Parish Meeting",
      description:
        "We explore the structure of Coptic doxologies — the poetic hymns that honor each saint. Students will learn the doxology of St. Mary (Epchois ari-epinivi) and the doxology of our patron St. Pishoy, then compare their literary structures.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stPishoy.id,
      seriesId: copticLanguage.id,
    },
  });

  // ── Young Adults Fellowship Events ────────────────────────────────────────────

  await prisma.event.create({
    data: {
      datetime: past(35, "19:30"),
      title: "Young Adults — Session 1: What Does It Mean to Be Coptic?",
      location: "Fellowship Hall",
      host: "Deacon Mina Nashed",
      tag: "Young Adults",
      description:
        "Our inaugural Young Adults gathering opened with a shared meal and an honest conversation: what does it actually mean to be Coptic Orthodox in Austin today? A wide-ranging discussion on identity, belonging, and faith.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMark.id,
      seriesId: youngAdults.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: past(7, "19:30"),
      title: "Young Adults — Session 2: Vocation — Work, Faith & Purpose",
      location: "Fellowship Hall",
      host: "Deacon Mina Nashed",
      tag: "Young Adults",
      description:
        "How do we integrate our faith with our careers, ambitions, and sense of calling? Deacon Mina led a discussion drawing on St. Paul's theology of vocation and a panel of young professionals sharing their own journeys.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMark.id,
      seriesId: youngAdults.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(14, "19:30"),
      title: "Young Adults — Session 3: Relationships, Dating & the Church",
      location: "Fellowship Hall",
      host: "Deacon Mina Nashed",
      tag: "Young Adults",
      description:
        "An open and honest conversation about relationships, dating as a Coptic Christian, the pressure of marriage expectations, and what the Church actually teaches — and doesn't teach — on these questions.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMark.id,
      seriesId: youngAdults.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(28, "19:30"),
      title: "Young Adults — Session 4: Doubt, Faith & Intellectual Honesty",
      location: "Fellowship Hall",
      host: "Deacon Mina Nashed",
      tag: "Young Adults",
      description:
        "A session for those wrestling with questions about faith — can doubt be part of the spiritual life? We look at the tradition of apophatic theology, the role of the intellect in Orthodox Christianity, and how to hold faith and reason together.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMark.id,
      seriesId: youngAdults.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(42, "19:30"),
      title:
        "Young Adults — Session 5: Service — Finding Your Place in the Church",
      location: "Fellowship Hall",
      host: "Deacon Mina Nashed",
      tag: "Young Adults",
      description:
        "How do young adults get connected to serving in the Church? Deacon Mina maps out the different ministries at St. Mark, shares how to discern your gifts, and facilitates small group conversations about barriers to involvement.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMark.id,
      seriesId: youngAdults.id,
    },
  });

  // ── Parish Pastoral Talks Events ─────────────────────────────────────────────

  await prisma.event.create({
    data: {
      datetime: past(28, "19:00"),
      title: "Pastoral Talk — Month 1: The Sacrament of Confession",
      location: "Main Hall",
      host: "Fr. Marcos Khalil",
      tag: "Parish Meeting",
      description:
        "Fr. Marcos opened the series with a deep exploration of confession — not as a transaction, but as a sacramental encounter with the healing Christ. He addressed common fears, misconceptions, and the gift of having a spiritual father.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stAnthony.id,
      seriesId: parishPastoral.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(13, "19:00"),
      title: "Pastoral Talk — Month 2: The Fasting Life",
      location: "Main Hall",
      host: "Fr. Marcos Khalil",
      tag: "Parish Meeting",
      description:
        "An exploration of the Coptic fasting tradition — the seven fasts, the theology of bodily discipline, and how fasting unites body and soul in the praise of God. Fr. Marcos addresses practical questions about fasting for working adults and families.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stAnthony.id,
      seriesId: parishPastoral.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(43, "19:00"),
      title: "Pastoral Talk — Month 3: Raising Children in the Faith",
      location: "Main Hall",
      host: "Fr. Marcos Khalil",
      tag: "Parish Meeting",
      description:
        "A talk for the whole parish — parents, grandparents, singles — on the community's shared responsibility for raising the next generation. Fr. Marcos draws on the Church Fathers and takes questions from the congregation.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stAnthony.id,
      seriesId: parishPastoral.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(73, "19:00"),
      title: "Pastoral Talk — Month 4: Preparing for Death & Eternal Life",
      location: "Main Hall",
      host: "Fr. Marcos Khalil",
      tag: "Parish Meeting",
      description:
        "A talk on the Coptic Church's vision of death, resurrection, and eternal life. Fr. Marcos addresses grief, caring for the dying, the rites of burial, and how the hope of resurrection shapes the way we live now.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stAnthony.id,
      seriesId: parishPastoral.id,
    },
  });

  // ── Standalone Events ─────────────────────────────────────────────────────────

  // St. Mary
  await prisma.event.create({
    data: {
      datetime: future(5, "07:00"),
      title: "Feast of the Annunciation — Divine Liturgy",
      location: "Sanctuary",
      host: "Fr. Bishoy Lamie",
      tag: "Feast Day",
      description:
        "Come celebrate the Feast of the Annunciation with a solemn Divine Liturgy in honor of the Virgin St. Mary. The service will be conducted in Coptic, Arabic, and English. All are welcome.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMary.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(12, "18:00"),
      title: 'Women of the Church — Monthly Meeting: "Prayer in the Home"',
      location: "Fellowship Hall",
      host: "Tasoni Mariam Lamie",
      tag: "Women's Meeting",
      description:
        "The monthly women's meeting at St. Mary, led by Tasoni Mariam. This month's topic is building a culture of prayer in the family home — morning prayers, evening prayers, and the Agpeya as a family practice. Light refreshments provided.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMary.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(20, "17:00"),
      title: 'Youth Talent Night — "Glory in the Making"',
      location: "Main Hall",
      host: "Maryam Iskander",
      tag: "Youth Meeting",
      description:
        "An evening showcasing the creative gifts of our youth — music, spoken word, art, drama, and dance. All performances are rooted in faith themes. Family and friends welcome. Light dinner from 5 PM, show starts at 6 PM.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMary.id,
    },
  });

  // St. George
  const orientationEvent = await prisma.event.create({
    data: {
      datetime: future(18, "17:00"),
      title: "New Servants Orientation Evening",
      location: "Main Hall",
      host: "Fr. Antonious Farag",
      tag: "Servants Meeting",
      description:
        "An evening dedicated to welcoming new servants to St. George Church. We will walk through the church's ministry structure, servant responsibilities, and how to get connected. Light dinner provided. All new and prospective servants welcome.",
      requiresRegistration: true,
      metadata: {
        registration: { capacity: 60, collectPhone: true, collectNotes: false },
      },
      churchId: stGeorge.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(11, "08:00"),
      title: "Deacons Training Day — Liturgical Rites & Responses",
      location: "Sanctuary",
      host: "Fr. Antonious Farag",
      tag: "Servants Meeting",
      description:
        "A full-day training for the deaconate of St. George — covering proper liturgical responses, the order of deacons' roles in the Divine Liturgy, vestment care, and the spirituality of the diaconate vocation. Breakfast and lunch included.",
      requiresRegistration: true,
      metadata: {
        registration: { capacity: 40, collectPhone: true, collectNotes: false },
      },
      churchId: stGeorge.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: past(10, "18:30"),
      title: "Annual Vestry Meeting — St. George Church",
      location: "Conference Room",
      host: "Fr. Antonious Farag",
      tag: "Parish Meeting",
      description:
        "The annual vestry meeting reviewed the church's financial report for the year, approved the 2026 budget, elected two new board members, and received updates on the fellowship hall renovation project.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stGeorge.id,
    },
  });

  const parishRetreatEvent = await prisma.event.create({
    data: {
      datetime: future(25, "08:00"),
      title: 'Parish Day Retreat — "Stillness & the City"',
      location: "Holy Cross Retreat Center, Cedar Hill, TX",
      host: "Fr. Antonious Farag",
      tag: "Retreat",
      description:
        "A full Saturday of silence, prayer, and spiritual renewal at the Holy Cross Retreat Center. The day includes Agpeya prayers, a morning talk by Fr. Antonious on the interior life, a silent lunch, and small group confession opportunities. No phones — just presence.",
      requiresRegistration: true,
      metadata: {
        registration: { capacity: 80, collectPhone: true, collectNotes: true },
      },
      churchId: stGeorge.id,
    },
  });

  // St. Mark
  await prisma.event.create({
    data: {
      datetime: past(12, "19:00"),
      title: 'Youth Halaqa: "Who Is the Holy Spirit?"',
      location: "Youth Hall",
      host: "Deacon Mina Nashed",
      tag: "Youth Meeting",
      description:
        "A standalone youth halaqa on the Person and work of the Holy Spirit in the life of a Coptic Christian. The session included group discussion, clips from Pope Shenouda III's lectures, and an open Q&A.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMark.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: past(20, "18:30"),
      title: "Annual Vestry Meeting — St. Mark Church",
      location: "Main Hall",
      host: "Fr. Cyril Mikhail",
      tag: "Parish Meeting",
      description:
        "The annual vestry meeting reviewed the church's financial report, elected new board members, and discussed the renovation project for the baptistry. Minutes are available from the church office.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMark.id,
    },
  });

  const hikeEvent = await prisma.event.create({
    data: {
      datetime: future(9, "07:30"),
      title: "Youth Sunrise Hike — Barton Creek Greenbelt",
      location: "Barton Creek Greenbelt, Austin, TX",
      host: "Deacon Mina Nashed",
      tag: "Youth Meeting",
      description:
        "An early morning hike through the Barton Creek Greenbelt for youth and young adults. We will begin with morning prayers at the trailhead, hike the Spyglass-Gus Fruh loop (4.5 miles), and close with a reflection on creation and the spiritual life. Breakfast tacos afterward.",
      requiresRegistration: true,
      metadata: {
        registration: { capacity: 50, collectPhone: true, collectNotes: false },
      },
      churchId: stMark.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(16, "21:30"),
      title: "Friday Midnight Praise — Feast of St. Mark",
      location: "Sanctuary",
      host: "Fr. Cyril Mikhail",
      tag: "Feast Day",
      description:
        "A special Midnight Praise (Tasbeha) celebrating the Feast of St. Mark the Evangelist, founder of the Coptic Church. The praises will be led by the church choir in Coptic and Arabic, with a short homily on the witness of St. Mark.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMark.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(45, "11:00"),
      title: "Annual Church Family Picnic",
      location: "Zilker Park, Austin, TX",
      host: "St. Mark Parish Committee",
      tag: "Social",
      description:
        "Our beloved annual picnic at Zilker Park — a day for the whole St. Mark family to enjoy food, games, fellowship, and the outdoors. Bring your family, your appetite, and a side dish to share. Kids' games, volleyball, and prizes.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stMark.id,
    },
  });

  // Archangel Michael
  await prisma.event.create({
    data: {
      datetime: past(45, "19:00"),
      title: '"The Life of St. Moses the Black" — Evening Lecture',
      location: "Main Hall",
      host: "Dr. Hany Takla",
      tag: "Lecture",
      description:
        "Dr. Hany Takla of the St. Shenouda Coptic Society delivered a compelling lecture on the life and legacy of St. Moses the Black — from bandit to monk to martyr. His story is a testament to the transforming grace of God and the ascetic tradition of the Desert Fathers.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: archangel.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(4, "07:00"),
      title: "Feast of St. Anthony the Great — Divine Liturgy",
      location: "Sanctuary",
      host: "Fr. Boulos Samir",
      tag: "Feast Day",
      description:
        "A solemn Divine Liturgy commemorating St. Anthony the Great, father of monasticism, on his feast day. Fr. Boulos will preach on the radical witness of Anthony's life and its meaning for Christians in the modern world. All are welcome.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: archangel.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(30, "18:00"),
      title: "Parish Community Dinner — Spring Gathering",
      location: "Fellowship Hall",
      host: "Archangel Michael Parish Committee",
      tag: "Social",
      description:
        "The quarterly community dinner for the parish family of Archangel Michael Church. Each family is invited to bring a dish representing their heritage. An evening of food, fellowship, and gratitude for our diverse community.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: archangel.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: past(3, "18:00"),
      title: "Summer Fundraiser Dinner — CANCELLED",
      location: "Fellowship Hall",
      host: "Fr. Boulos Samir",
      tag: "Social",
      description:
        "Our annual summer fundraiser dinner to support the church's building fund. Unfortunately this event was cancelled due to a scheduling conflict with the diocese retreat. A new date will be announced soon.",
      cancelledAt: past(10),
      cancellationReason:
        "Scheduling conflict with the Diocese of Southern USA annual retreat. A rescheduled date will be communicated by the church office.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: archangel.id,
    },
  });

  // St. Pishoy (The Woodlands)
  await prisma.event.create({
    data: {
      datetime: past(5, "07:00"),
      title: "Divine Liturgy — Feast of St. Pishoy",
      location: "Sanctuary",
      host: "Fr. Demetrius Botros",
      tag: "Feast Day",
      description:
        "Our patronal feast — the Feast of Abba Pishoy the Great. The Divine Liturgy was celebrated in Bohairic Coptic and English, followed by a parish luncheon. The day marked the 14th anniversary of our church's founding.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stPishoy.id,
    },
  });

  const iconEvent = await prisma.event.create({
    data: {
      datetime: future(18, "10:00"),
      title: 'Icon Writing Workshop — "The Theotokos Hodegetria"',
      location: "Fellowship Hall",
      host: "Iconographer Bishoy Ayad",
      tag: "Workshop",
      description:
        "A full-day introduction to Coptic iconography. Iconographer Bishoy Ayad will guide participants through the theology of icons and the step-by-step process of creating a small icon of the Hodegetria — the Virgin Mary pointing to Christ. All materials provided.",
      requiresRegistration: true,
      price: "$45",
      metadata: {
        registration: { capacity: 20, collectPhone: true, collectNotes: true },
      },
      churchId: stPishoy.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(26, "09:00"),
      title: "Youth Soccer Tournament — St. Pishoy Cup",
      location: "Northgate Sports Complex, The Woodlands, TX",
      host: "St. Pishoy Youth Committee",
      tag: "Youth Meeting",
      description:
        "The inaugural St. Pishoy Cup — a friendly soccer tournament for youth (ages 12–22) from Coptic churches across the Houston area. Teams of 7 compete in a round-robin format. Trophy for the winners, participation medals for all. Registration required to form teams.",
      requiresRegistration: true,
      metadata: {
        registration: { capacity: 70, collectPhone: true, collectNotes: false },
      },
      churchId: stPishoy.id,
    },
  });

  // St. Anthony Fort Worth
  await prisma.event.create({
    data: {
      datetime: future(7, "07:00"),
      title: "Feast of St. Anthony — Divine Liturgy & Breakfast",
      location: "Sanctuary",
      host: "Fr. Marcos Khalil",
      tag: "Feast Day",
      description:
        "Celebrating the feast of our patron St. Anthony the Great with a solemn Divine Liturgy followed by a parish breakfast. Fr. Marcos will preach on Anthony's encounter with God in the desert and its meaning for our own spiritual journey.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stAnthony.id,
    },
  });

  await prisma.event.create({
    data: {
      datetime: future(22, "18:30"),
      title: 'Marriage Enrichment Evening — "The Art of Forgiveness"',
      location: "Fellowship Hall",
      host: "Fr. Marcos Khalil & Dr. Nadia Habib",
      tag: "Parish Meeting",
      description:
        "A one-evening marriage enrichment event for married couples of all ages. Fr. Marcos leads with a reflection on forgiveness in the sacramental life of a Christian marriage, followed by a workshop session facilitated by Dr. Nadia Habib. Light dinner at 6:30 PM.",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      churchId: stAnthony.id,
    },
  });

  const womensEvent = await prisma.event.create({
    data: {
      datetime: future(40, "08:00"),
      title: 'Women\'s Day of Reflection — "Mary at the Foot of the Cross"',
      location: "St. Anthony Church",
      host: "Tasoni Irene Khalil",
      tag: "Women's Meeting",
      description:
        "A Saturday day of reflection for the women of St. Anthony Church and invited guests. Tasoni Irene leads the morning with Agpeya prayers, a meditation on the Virgin Mary's witness at Golgotha, and small group discussions. Lunch provided.",
      requiresRegistration: true,
      metadata: {
        registration: { capacity: 60, collectPhone: true, collectNotes: false },
      },
      churchId: stAnthony.id,
    },
  });

  // Cross-church event
  await prisma.event.create({
    data: {
      datetime: future(60, "08:00"),
      title: "Texas Coptic Youth Conference 2026",
      location: "St. Mary Church, Houston, TX",
      host: "Diocese of the Southern USA Youth Committee",
      tag: "Youth Meeting",
      description:
        "The annual gathering of Coptic youth from across Texas and the Southern USA — hosted this year by St. Mary Church, Houston. Two days of talks, workshops, praise, and community for ages 15–30. Speakers from across the Diocese and beyond. Registration opens soon.",
      requiresRegistration: true,
      price: "$35",
      metadata: {
        registration: {
          capacity: 400,
          collectPhone: true,
          collectNotes: false,
        },
      },
      churchId: stMary.id,
    },
  });

  // ── Main Camp Event ───────────────────────────────────────────────────────────

  const campDay = 32;

  const campEvent = await prisma.event.create({
    data: {
      datetime: future(campDay, "08:00"),
      title: 'St. Mary Summer Camp 2026 — "Called by Name"',
      location: "Lakeview Christian Retreat Center, Waco, TX",
      host: "Fr. Bishoy Lamie",
      tag: "Camp",
      description:
        "Join us for St. Mary's annual summer camp for youth and young adults (ages 13–22). This year's theme is \"Called by Name\" — exploring our identity in Christ, our vocation, and what it means to be Coptic Orthodox in today's world. Five days of liturgies, talks, workshops, swimming, hiking, and deep community. Registration required. Cost covers lodging and all meals.",
      requiresRegistration: true,
      price: "$175",
      metadata: {
        registration: { capacity: 120, collectPhone: true, collectNotes: true },
        camp: {
          endDate: futureDate(campDay + 4),
          allowPartialRegistration: true,
          agenda: [
            {
              id: "day1-arrive",
              date: futureDate(campDay),
              time: "08:00",
              title: "Arrival & Registration",
              description:
                "Check in, settle into cabins, and meet your camp family.",
            },
            {
              id: "day1-liturgy",
              date: futureDate(campDay),
              time: "10:00",
              title: "Opening Divine Liturgy",
              description:
                "We begin our camp week with a solemn Divine Liturgy celebrated by Fr. Bishoy Lamie.",
            },
            {
              id: "day1-games",
              date: futureDate(campDay),
              time: "15:00",
              title: "Team Building & Welcome Games",
              description:
                "Get to know your fellow campers with outdoor team-building activities.",
            },
            {
              id: "day1-vespers",
              date: futureDate(campDay),
              time: "20:00",
              title: "Evening Vespers & Theme Introduction",
              description:
                'Evening prayer followed by an introduction to the camp theme "Called by Name."',
            },
            {
              id: "day2-agpeya",
              date: futureDate(campDay + 1),
              time: "06:30",
              title: "Morning Agpeya",
              description:
                "Start the day with the Third and Sixth Hour prayers of the Agpeya.",
            },
            {
              id: "day2-talk1",
              date: futureDate(campDay + 1),
              time: "09:00",
              title: '"Who Am I?" — Identity in Christ',
              description:
                "Fr. Bishoy opens our theological journey by exploring what Scripture and the Church Fathers say about our identity as children of God.",
            },
            {
              id: "day2-workshop1",
              date: futureDate(campDay + 1),
              time: "11:30",
              title: "Workshop: Icons & the Theology of Beauty",
              description:
                "A hands-on workshop exploring Coptic iconography and what it tells us about the Kingdom of Heaven.",
            },
            {
              id: "day2-recreation",
              date: futureDate(campDay + 1),
              time: "15:00",
              title: "Swimming & Recreation",
              description:
                "Free time at the lake — swimming, kayaking, and outdoor games.",
            },
            {
              id: "day2-praise",
              date: futureDate(campDay + 1),
              time: "20:00",
              title: "Evening Praise (Tasbeha)",
              description:
                "Youth-led Tasbeha night — a joyful evening of Coptic hymns and praise.",
            },
            {
              id: "day3-liturgy",
              date: futureDate(campDay + 2),
              time: "06:30",
              title: "Sunday Divine Liturgy",
              description:
                "The centerpiece of our week — a full Sunday Liturgy in the Bright Season tunes.",
            },
            {
              id: "day3-talk2",
              date: futureDate(campDay + 2),
              time: "10:30",
              title: '"What Is My Vocation?" — Called to Serve',
              description:
                "Exploring the different vocations in the Church — monasticism, marriage, deaconate, and lay service — and how to discern your calling.",
            },
            {
              id: "day3-workshop2",
              date: futureDate(campDay + 2),
              time: "14:00",
              title: "Workshop: The Agpeya & Daily Prayer",
              description:
                "Learn the structure and spirituality of the Agpeya (Coptic Book of Hours) and how to build a daily prayer rule.",
            },
            {
              id: "day3-talent",
              date: futureDate(campDay + 2),
              time: "19:00",
              title: "Talent Show Night",
              description:
                "An evening of music, skits, and creativity showcasing the talents of our camp community.",
            },
            {
              id: "day4-agpeya",
              date: futureDate(campDay + 3),
              time: "06:30",
              title: "Morning Agpeya",
              description:
                "Morning prayers to begin the penultimate day of camp.",
            },
            {
              id: "day4-talk3",
              date: futureDate(campDay + 3),
              time: "09:00",
              title: '"Living Coptic in the West" — Faith & Culture',
              description:
                "A panel discussion with young Coptic professionals on navigating faith, identity, and culture as Copts in the diaspora.",
            },
            {
              id: "day4-hike",
              date: futureDate(campDay + 3),
              time: "13:00",
              title: "Guided Nature Hike",
              description:
                "A three-mile hike through the Bosque River trail, concluding with a reflection on creation and the Desert Fathers.",
            },
            {
              id: "day4-campfire",
              date: futureDate(campDay + 3),
              time: "20:00",
              title: "Campfire & Testimonies",
              description:
                "An intimate campfire gathering where campers share their stories of encountering God during the week.",
            },
            {
              id: "day5-liturgy",
              date: futureDate(campDay + 4),
              time: "06:30",
              title: "Closing Divine Liturgy",
              description:
                "We close our camp week with a Divine Liturgy and renewal of baptismal commitments.",
            },
            {
              id: "day5-reflection",
              date: futureDate(campDay + 4),
              time: "10:30",
              title: "Final Reflection & Sending",
              description:
                "Fr. Bishoy leads the closing session with camper testimonies, a charge for the year ahead, and prayers of blessing.",
            },
            {
              id: "day5-depart",
              date: futureDate(campDay + 4),
              time: "13:00",
              title: "Departure",
              description:
                "Safe travels home. May God keep you until we meet again.",
            },
          ],
        },
      },
      churchId: stMary.id,
    },
  });

  // ── St. Pishoy Youth Retreat (3-day) ─────────────────────────────────────────

  const retreatDay = 50;

  const retreatEvent = await prisma.event.create({
    data: {
      datetime: future(retreatDay, "15:00"),
      title: 'St. Pishoy Youth Retreat 2026 — "The Desert Within"',
      location: "Camp Eagle, Marble Falls, TX",
      host: "Fr. Demetrius Botros",
      tag: "Camp",
      description:
        'A three-day youth retreat for ages 16–30 at Camp Eagle on Lake Travis. The theme "The Desert Within" draws from the monastic tradition of our patron saints, inviting participants to encounter God through silence, prayer, and community. Includes liturgies, desert spirituality talks, kayaking, and a night-time campfire vigil. Cost covers lodging and meals.',
      requiresRegistration: true,
      price: "$110",
      metadata: {
        registration: { capacity: 60, collectPhone: true, collectNotes: true },
        camp: {
          endDate: futureDate(retreatDay + 2),
          allowPartialRegistration: false,
          agenda: [
            {
              id: "r-day1-arrive",
              date: futureDate(retreatDay),
              time: "15:00",
              title: "Arrival & Welcome",
              description:
                "Check-in at Camp Eagle, cabin assignments, and welcome orientation.",
            },
            {
              id: "r-day1-vespers",
              date: futureDate(retreatDay),
              time: "18:00",
              title: "Opening Vespers & Theme Introduction",
              description:
                'Evening prayer followed by Fr. Demetrius\'s introduction to the theme "The Desert Within."',
            },
            {
              id: "r-day1-dinner",
              date: futureDate(retreatDay),
              time: "20:00",
              title: "Community Dinner & Icebreakers",
              description:
                "Shared dinner and group icebreaker activities to build community.",
            },
            {
              id: "r-day2-agpeya",
              date: futureDate(retreatDay + 1),
              time: "06:30",
              title: "Morning Agpeya",
              description:
                "Third and Sixth Hour prayers at sunrise overlooking the lake.",
            },
            {
              id: "r-day2-liturgy",
              date: futureDate(retreatDay + 1),
              time: "08:00",
              title: "Divine Liturgy",
              description:
                "A celebrated Divine Liturgy in the outdoor chapel, all communing together.",
            },
            {
              id: "r-day2-talk1",
              date: futureDate(retreatDay + 1),
              time: "10:30",
              title: 'Talk 1: "What Is the Desert?" — Solitude & God',
              description:
                "Fr. Demetrius explores the theology of the desert — why the early monks fled to the desert, what they found there, and what inner desert each of us carries.",
            },
            {
              id: "r-day2-silence",
              date: futureDate(retreatDay + 1),
              time: "13:00",
              title: "The Great Silence — 2 Hours",
              description:
                "Two hours of guided silence. Participants may walk the grounds, journal, sit in the chapel, or pray alone. No phones.",
            },
            {
              id: "r-day2-kayak",
              date: futureDate(retreatDay + 1),
              time: "15:30",
              title: "Kayaking on Lake Travis",
              description:
                "Recreational kayaking on the lake — an opportunity for creation-centered prayer and fellowship.",
            },
            {
              id: "r-day2-talk2",
              date: futureDate(retreatDay + 1),
              time: "19:00",
              title: 'Talk 2: "The Warfare of Thoughts" — Logismoi & Nepsis',
              description:
                "Drawing from Evagrius Ponticus and the Apophthegmata, Fr. Demetrius teaches on the eight logismoi (thoughts) and the practice of watchfulness (nepsis).",
            },
            {
              id: "r-day2-vigil",
              date: futureDate(retreatDay + 1),
              time: "22:00",
              title: "Campfire Vigil & Confession",
              description:
                "A night-time gathering around the fire with psalms, testimonies, and the opportunity for individual confession with Fr. Demetrius.",
            },
            {
              id: "r-day3-agpeya",
              date: futureDate(retreatDay + 2),
              time: "07:00",
              title: "Morning Agpeya",
              description: "Final morning prayers together.",
            },
            {
              id: "r-day3-talk3",
              date: futureDate(retreatDay + 2),
              time: "09:00",
              title: 'Talk 3: "Bringing the Desert Home" — A Rule of Life',
              description:
                "How do we carry what we've experienced here back into daily life? Fr. Demetrius guides participants in writing a personal rule of life — prayer, fasting, service, and silence.",
            },
            {
              id: "r-day3-closing",
              date: futureDate(retreatDay + 2),
              time: "11:30",
              title: "Closing Liturgy of the Word & Sending",
              description:
                "A brief liturgy of the Word, blessing of each participant, and the sending prayer.",
            },
            {
              id: "r-day3-depart",
              date: futureDate(retreatDay + 2),
              time: "13:00",
              title: "Departure",
              description: "Safe travels. Go in peace.",
            },
          ],
        },
      },
      churchId: stPishoy.id,
    },
  });

  // ── Users ─────────────────────────────────────────────────────────────────────

  // Church Admins — full control over their church and all its events/series
  const organiser1 = await prisma.user.create({
    data: {
      name: "Fr. Bishoy Lamie",
      email: "organiser1@example.com",
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  const organiser2 = await prisma.user.create({
    data: {
      name: "Deacon Mina Nashed",
      email: "organiser2@example.com",
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  const organiser3 = await prisma.user.create({
    data: {
      name: "Fr. Antonious Farag",
      email: "organiser3@example.com",
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  const organiser4 = await prisma.user.create({
    data: {
      name: "Fr. Demetrius Botros",
      email: "organiser4@example.com",
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  const organiser5 = await prisma.user.create({
    data: {
      name: "Fr. Marcos Khalil",
      email: "organiser5@example.com",
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  // Church Admin for Archangel Michael — manages the sixth church
  const organiser6 = await prisma.user.create({
    data: {
      name: "Fr. Boulos Samir",
      email: "organiser6@example.com",
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  await prisma.churchMembership.createMany({
    data: [
      { userId: organiser1.id, churchId: stMary.id, role: "CHURCH_ADMIN" },
      { userId: organiser2.id, churchId: stMark.id, role: "CHURCH_ADMIN" },
      { userId: organiser3.id, churchId: stGeorge.id, role: "CHURCH_ADMIN" },
      { userId: organiser4.id, churchId: stPishoy.id, role: "CHURCH_ADMIN" },
      { userId: organiser5.id, churchId: stAnthony.id, role: "CHURCH_ADMIN" },
      { userId: organiser6.id, churchId: archangel.id, role: "CHURCH_ADMIN" },
    ],
  });

  // Event Manager — can create, edit, publish, delete events and manage series at stMary
  // Cannot manage church membership or church settings
  const eventManager1 = await prisma.user.create({
    data: {
      name: "Maryam Iskander",
      email: "eventmanager@example.com",
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  await prisma.churchMembership.create({
    data: {
      userId: eventManager1.id,
      churchId: stMary.id,
      role: "EVENT_MANAGER",
      assignedBy: organiser1.id,
    },
  });

  // Event Creator — can create events at stGeorge; auto-assigned EVENT_EDITOR on their own events
  // Cannot edit or delete events they did not create
  const eventCreator1 = await prisma.user.create({
    data: {
      name: "George Tadros",
      email: "eventcreator@example.com",
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  await prisma.churchMembership.create({
    data: {
      userId: eventCreator1.id,
      churchId: stGeorge.id,
      role: "EVENT_CREATOR",
      assignedBy: organiser3.id,
    },
  });

  // Series Manager — can edit the Lenten Tasbeha series and add/modify its sessions
  // Does not have church-level access; access is scoped to this series only
  const seriesManager1 = await prisma.user.create({
    data: {
      name: "Cantor George Mikhail",
      email: "seriesmanager@example.com",
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  await prisma.seriesStaffAssignment.create({
    data: {
      userId: seriesManager1.id,
      seriesId: lentSeries.id,
      role: "SERIES_MANAGER",
      assignedBy: organiser1.id,
    },
  });

  // Series Session Creator — can add sessions to the Young Adults series
  // Cannot edit series metadata; can modify any event within the series
  const seriesSessionCreator1 = await prisma.user.create({
    data: {
      name: "Deacon Peter Naguib",
      email: "seriescreator@example.com",
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  await prisma.seriesStaffAssignment.create({
    data: {
      userId: seriesSessionCreator1.id,
      seriesId: youngAdults.id,
      role: "SERIES_SESSION_CREATOR",
      assignedBy: organiser2.id,
    },
  });

  // Platform Admin — full access across all churches and events
  const platformAdmin = await prisma.user.create({
    data: {
      name: "Anthony Saleeb",
      email: "anthonysaleeb@gmail.com",
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  await prisma.platformRoleAssignment.create({
    data: { userId: platformAdmin.id, role: "PLATFORM_ADMIN" },
  });

  // ── Question Library ──────────────────────────────────────────────────────────

  // organiser1 (Fr. Bishoy) — camp / retreat / large event questions
  const lib1 = await prisma.$transaction([
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser1.id,
        type: "MULTIPLE_CHOICE",
        label: "T-shirt size",
        options: ["XS", "S", "M", "L", "XL", "XXL"],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser1.id,
        type: "MULTIPLE_CHOICE",
        label: "Age group",
        options: ["13–15", "16–18", "19–22", "23–30"],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser1.id,
        type: "YES_NO",
        label: "Can you swim?",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser1.id,
        type: "SHORT_TEXT",
        label: "Emergency contact name and phone number",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser1.id,
        type: "MULTIPLE_CHOICE",
        label: "Dietary restrictions",
        options: [
          "None",
          "Vegetarian",
          "Vegan",
          "Gluten-free",
          "Nut allergy",
          "Other",
        ],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser1.id,
        type: "LONG_TEXT",
        label: "Medical conditions or allergies we should know about",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser1.id,
        type: "YES_NO",
        label: "Is this your first time attending this camp?",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser1.id,
        type: "SHORT_TEXT",
        label: "Church you attend",
        options: [],
      },
    }),
  ]);

  // organiser2 (Deacon Mina) — general / bible study / hike questions
  const lib2 = await prisma.$transaction([
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser2.id,
        type: "YES_NO",
        label: "Have you read the required material?",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser2.id,
        type: "SHORT_TEXT",
        label: "What is your deacon name (if ordained)?",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser2.id,
        type: "MULTIPLE_CHOICE",
        label: "Dietary restrictions",
        options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser2.id,
        type: "LONG_TEXT",
        label: "Any questions you would like addressed?",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser2.id,
        type: "MULTIPLE_CHOICE",
        label: "Fitness level for hike",
        options: ["Beginner", "Moderate", "Experienced"],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser2.id,
        type: "YES_NO",
        label: "Do you have suitable footwear for a trail hike?",
        options: [],
      },
    }),
  ]);

  // organiser3 (Fr. Antonious) — servants / formation / retreat questions
  const lib3 = await prisma.$transaction([
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser3.id,
        type: "MULTIPLE_CHOICE",
        label: "Which ministry are you interested in serving?",
        options: [
          "Youth",
          "Sunday School",
          "Choir",
          "Deaconate",
          "Outreach",
          "Other",
        ],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser3.id,
        type: "MULTIPLE_CHOICE",
        label: "How long have you been a member of St. George?",
        options: ["Less than 1 year", "1–3 years", "3–5 years", "5+ years"],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser3.id,
        type: "YES_NO",
        label: "Do you currently serve in any ministry?",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser3.id,
        type: "LONG_TEXT",
        label: "What do you hope to get out of this event?",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser3.id,
        type: "SHORT_TEXT",
        label: "Emergency contact name and phone number",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser3.id,
        type: "MULTIPLE_CHOICE",
        label: "Dietary restrictions",
        options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser3.id,
        type: "YES_NO",
        label: "Will you be driving or need a carpool?",
        options: [],
      },
    }),
  ]);

  // organiser4 (Fr. Demetrius) — retreat / icon workshop questions
  const lib4 = await prisma.$transaction([
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser4.id,
        type: "YES_NO",
        label: "Have you attended a retreat before?",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser4.id,
        type: "MULTIPLE_CHOICE",
        label: "Age group",
        options: ["16–18", "19–22", "23–30", "30+"],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser4.id,
        type: "MULTIPLE_CHOICE",
        label: "Dietary restrictions",
        options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser4.id,
        type: "SHORT_TEXT",
        label: "Emergency contact name and phone number",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser4.id,
        type: "LONG_TEXT",
        label:
          "Is there anything you are hoping God will speak to you about on this retreat?",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser4.id,
        type: "YES_NO",
        label: "Do you have any prior experience with iconography?",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser4.id,
        type: "SHORT_TEXT",
        label: "Church you attend",
        options: [],
      },
    }),
  ]);

  // organiser5 (Fr. Marcos) — women's day / general questions
  const lib5 = await prisma.$transaction([
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser5.id,
        type: "MULTIPLE_CHOICE",
        label: "Dietary restrictions",
        options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser5.id,
        type: "SHORT_TEXT",
        label: "Emergency contact name and phone number",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser5.id,
        type: "LONG_TEXT",
        label: "Any prayer requests you would like to share?",
        options: [],
      },
    }),
    prisma.questionLibraryItem.create({
      data: {
        createdById: organiser5.id,
        type: "YES_NO",
        label: "Will you need childcare during the event?",
        options: [],
      },
    }),
  ]);

  // ── Event Questions ───────────────────────────────────────────────────────────

  // Camp — St. Mary Summer Camp
  await prisma.eventQuestion.createMany({
    data: [
      {
        eventId: campEvent.id,
        type: "MULTIPLE_CHOICE",
        label: "T-shirt size",
        options: ["XS", "S", "M", "L", "XL", "XXL"],
        required: true,
        order: 0,
        libraryItemId: lib1[0].id,
      },
      {
        eventId: campEvent.id,
        type: "MULTIPLE_CHOICE",
        label: "Age group",
        options: ["13–15", "16–18", "19–22", "23–30"],
        required: true,
        order: 1,
        libraryItemId: lib1[1].id,
      },
      {
        eventId: campEvent.id,
        type: "YES_NO",
        label: "Can you swim?",
        options: [],
        required: true,
        order: 2,
        libraryItemId: lib1[2].id,
      },
      {
        eventId: campEvent.id,
        type: "SHORT_TEXT",
        label: "Emergency contact name and phone number",
        options: [],
        required: true,
        order: 3,
        libraryItemId: lib1[3].id,
      },
      {
        eventId: campEvent.id,
        type: "MULTIPLE_CHOICE",
        label: "Dietary restrictions",
        options: [
          "None",
          "Vegetarian",
          "Vegan",
          "Gluten-free",
          "Nut allergy",
          "Other",
        ],
        required: false,
        order: 4,
        libraryItemId: lib1[4].id,
      },
      {
        eventId: campEvent.id,
        type: "LONG_TEXT",
        label: "Medical conditions or allergies we should know about",
        options: [],
        required: false,
        order: 5,
        libraryItemId: lib1[5].id,
      },
      {
        eventId: campEvent.id,
        type: "YES_NO",
        label: "Is this your first time attending this camp?",
        options: [],
        required: false,
        order: 6,
        libraryItemId: lib1[6].id,
      },
      {
        eventId: campEvent.id,
        type: "SHORT_TEXT",
        label: "Church you attend",
        options: [],
        required: true,
        order: 7,
        libraryItemId: lib1[7].id,
      },
    ],
  });

  // Retreat — St. Pishoy Youth Retreat
  await prisma.eventQuestion.createMany({
    data: [
      {
        eventId: retreatEvent.id,
        type: "YES_NO",
        label: "Have you attended a retreat before?",
        options: [],
        required: false,
        order: 0,
        libraryItemId: lib4[0].id,
      },
      {
        eventId: retreatEvent.id,
        type: "MULTIPLE_CHOICE",
        label: "Age group",
        options: ["16–18", "19–22", "23–30", "30+"],
        required: true,
        order: 1,
        libraryItemId: lib4[1].id,
      },
      {
        eventId: retreatEvent.id,
        type: "MULTIPLE_CHOICE",
        label: "Dietary restrictions",
        options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
        required: false,
        order: 2,
        libraryItemId: lib4[2].id,
      },
      {
        eventId: retreatEvent.id,
        type: "SHORT_TEXT",
        label: "Emergency contact name and phone number",
        options: [],
        required: true,
        order: 3,
        libraryItemId: lib4[3].id,
      },
      {
        eventId: retreatEvent.id,
        type: "LONG_TEXT",
        label:
          "Is there anything you are hoping God will speak to you about on this retreat?",
        options: [],
        required: false,
        order: 4,
        libraryItemId: lib4[4].id,
      },
      {
        eventId: retreatEvent.id,
        type: "SHORT_TEXT",
        label: "Church you attend",
        options: [],
        required: true,
        order: 5,
        libraryItemId: lib4[6].id,
      },
    ],
  });

  // New Servants Orientation
  await prisma.eventQuestion.createMany({
    data: [
      {
        eventId: orientationEvent.id,
        type: "MULTIPLE_CHOICE",
        label: "Which ministry are you interested in serving?",
        options: [
          "Youth",
          "Sunday School",
          "Choir",
          "Deaconate",
          "Outreach",
          "Other",
        ],
        required: true,
        order: 0,
        libraryItemId: lib3[0].id,
      },
      {
        eventId: orientationEvent.id,
        type: "MULTIPLE_CHOICE",
        label: "How long have you been a member of St. George?",
        options: ["Less than 1 year", "1–3 years", "3–5 years", "5+ years"],
        required: false,
        order: 1,
        libraryItemId: lib3[1].id,
      },
      {
        eventId: orientationEvent.id,
        type: "YES_NO",
        label: "Do you currently serve in any ministry?",
        options: [],
        required: false,
        order: 2,
        libraryItemId: lib3[2].id,
      },
      {
        eventId: orientationEvent.id,
        type: "LONG_TEXT",
        label: "What do you hope to get out of this event?",
        options: [],
        required: false,
        order: 3,
        libraryItemId: lib3[3].id,
      },
      {
        eventId: orientationEvent.id,
        type: "MULTIPLE_CHOICE",
        label: "Dietary restrictions",
        options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
        required: false,
        order: 4,
        libraryItemId: lib3[5].id,
      },
    ],
  });

  // Youth Hike — St. Mark
  await prisma.eventQuestion.createMany({
    data: [
      {
        eventId: hikeEvent.id,
        type: "MULTIPLE_CHOICE",
        label: "Fitness level for hike",
        options: ["Beginner", "Moderate", "Experienced"],
        required: true,
        order: 0,
        libraryItemId: lib2[4].id,
      },
      {
        eventId: hikeEvent.id,
        type: "YES_NO",
        label: "Do you have suitable footwear for a trail hike?",
        options: [],
        required: true,
        order: 1,
        libraryItemId: lib2[5].id,
      },
      {
        eventId: hikeEvent.id,
        type: "MULTIPLE_CHOICE",
        label: "Dietary restrictions",
        options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
        required: false,
        order: 2,
        libraryItemId: lib2[2].id,
      },
    ],
  });

  // Icon Writing Workshop
  await prisma.eventQuestion.createMany({
    data: [
      {
        eventId: iconEvent.id,
        type: "YES_NO",
        label: "Do you have any prior experience with iconography?",
        options: [],
        required: false,
        order: 0,
        libraryItemId: lib4[5].id,
      },
      {
        eventId: iconEvent.id,
        type: "MULTIPLE_CHOICE",
        label: "Dietary restrictions",
        options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
        required: false,
        order: 1,
        libraryItemId: lib4[2].id,
      },
      {
        eventId: iconEvent.id,
        type: "SHORT_TEXT",
        label: "Church you attend",
        options: [],
        required: true,
        order: 2,
        libraryItemId: lib4[6].id,
      },
    ],
  });

  // Women's Day of Reflection — St. Anthony
  await prisma.eventQuestion.createMany({
    data: [
      {
        eventId: womensEvent.id,
        type: "MULTIPLE_CHOICE",
        label: "Dietary restrictions",
        options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
        required: false,
        order: 0,
        libraryItemId: lib5[0].id,
      },
      {
        eventId: womensEvent.id,
        type: "YES_NO",
        label: "Will you need childcare during the event?",
        options: [],
        required: false,
        order: 1,
        libraryItemId: lib5[3].id,
      },
      {
        eventId: womensEvent.id,
        type: "LONG_TEXT",
        label: "Any prayer requests you would like to share?",
        options: [],
        required: false,
        order: 2,
        libraryItemId: lib5[2].id,
      },
    ],
  });

  // Parish Day Retreat — St. George
  await prisma.eventQuestion.createMany({
    data: [
      {
        eventId: parishRetreatEvent.id,
        type: "MULTIPLE_CHOICE",
        label: "Dietary restrictions",
        options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
        required: false,
        order: 0,
        libraryItemId: lib3[5].id,
      },
      {
        eventId: parishRetreatEvent.id,
        type: "YES_NO",
        label: "Will you be driving or need a carpool?",
        options: [],
        required: false,
        order: 1,
        libraryItemId: lib3[6].id,
      },
      {
        eventId: parishRetreatEvent.id,
        type: "LONG_TEXT",
        label: "What do you hope to get out of this event?",
        options: [],
        required: false,
        order: 2,
        libraryItemId: lib3[3].id,
      },
    ],
  });

  // ── Regular Users ─────────────────────────────────────────────────────────────

  await prisma.user.create({
    data: {
      name: "Mark Girgis",
      email: "user@example.com",
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  await prisma.user.create({
    data: {
      name: "Sara Hanna",
      email: "user2@example.com",
      emailVerified: new Date(),
      onboardingCompleted: true,
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
