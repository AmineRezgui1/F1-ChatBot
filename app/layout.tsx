import "./chatf1.css";

export const metadata = {
    title: "F1GPT",
    description: "The n°1 AI-powered Formula 1 assistant",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="en">
        <body>{children}</body>
        </html>
    );
};

export default RootLayout;
