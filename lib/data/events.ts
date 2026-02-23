export type Event = {
  id: number;
  datetime: string;
  title: string;
  location: string;
  host: string;
  tag: string;
  description: string;
};

export const events: Event[] = [
  {
    id: 1,
    datetime: "MON, 10 MAY | 7:30 PM",
    title: "The Cross of Forgiveness",
    location: "St Mary Church",
    host: "Fr Dan Fanous",
    tag: "Bible Study",
    description:
      "Join us for an evening of scripture and reflection as Fr Dan Fanous leads us through the profound mystery of the Cross and what forgiveness truly means in the life of a Christian. All are welcome.",
  },
  {
    id: 2,
    datetime: "FRI, 14 MAY | 6:30 PM",
    title: "Youth Fellowship",
    location: "St George Church",
    host: "Fr Mark Mikhail",
    tag: "Meeting",
    description:
      "A Friday night gathering for young adults to connect, worship together, and hear uplifting words from Fr Mark Mikhail. Come with an open heart and bring a friend!",
  },
  {
    id: 3,
    datetime: "SAT, 15 MAY | 9:00 AM",
    title: "Community Outreach",
    location: "Downtown Community Center",
    host: "Deacon Peter",
    tag: "Camp",
    description:
      "Roll up your sleeves and serve alongside Deacon Peter and the wider community. We will be volunteering at the Downtown Community Center — food, fellowship, and making a difference together.",
  },
];
