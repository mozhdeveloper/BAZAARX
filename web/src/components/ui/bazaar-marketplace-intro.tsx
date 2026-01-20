

export default function BazaarMarketplaceIntro() {
    return (
        <section className="bg-white py-16 sm:py-24 flex flex-col items-center justify-center text-center px-4">
            <span className="text-xs sm:text-sm md:text-base text-gray-400 uppercase tracking-[0.2em] mb-4">
                your next marketplace awaits
            </span>

            {/* Vertical Line */}
            <div className="w-px h-24 sm:h-36 md:h-52 lg:h-96 bg-gradient-to-b from-transparent via-orange-500 to-transparent mb-6 sm:mb-8"></div>

            <h2 className="font-fondamento text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold text-[#FF6A00] tracking-tighter mb-6 sm:mb-8">
                BazaarX
            </h2>

            <p className="text-base sm:text-lg md:text-xl text-gray-500 max-w-2xl leading-relaxed px-4">
                Bringing you closer to the source than ever before. See how we’ve built a smarter way to shop.
            </p>
        </section>
    );
}
