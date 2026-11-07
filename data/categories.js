const image = (photoId) =>
    `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1000&h=700&q=82`;

export const categoriesData = [
    {
        title: "Music & Concerts",
        eventCategory: "Music",
        image: image("photo-1514525253161-7a46d19cd819"),
        imageAlt: "A crowd gathered beneath colorful concert lights",
    },
    {
        title: "Technology",
        eventCategory: "Technology",
        image: image("photo-1505373877841-8d25f7d46678"),
        imageAlt: "People sharing ideas during a technology meetup",
    },
    {
        title: "Art & Creativity",
        eventCategory: "Art & Culture",
        image: image("photo-1460661419201-fd4cecdf8a8b"),
        imageAlt: "Colorful artwork and paintbrushes on a studio table",
    },
    {
        title: "Business & Networking",
        eventCategory: "Business",
        image: image("photo-1515187029135-18ee286d815b"),
        imageAlt: "Attendees exchanging ideas around a conference table",
    },
    {
        title: "Food & Festivals",
        eventCategory: "Food",
        image: image("photo-1555939594-58d7cb561ad1"),
        imageAlt: "A table of regional dishes prepared for sharing",
    },
    {
        title: "Lifestyle & Social",
        eventCategory: "Lifestyle",
        image: image("photo-1533105079780-92b9be482077"),
        imageAlt: "A relaxed outdoor gathering near the coast",
    },
];
