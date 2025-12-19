"use client";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { useRef } from "react";

function BrandTestimonials() {
  const testimonialRef = useRef<HTMLDivElement>(null);

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.4,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  return (
    <main className="w-full bg-white">
      <section
        className="relative h-full container text-black mx-auto rounded-lg py-14 bg-white"
        ref={testimonialRef}
      >
        <article className={"max-w-screen-md mx-auto text-center space-y-2 "}>
          <TimelineContent
            as="h1"
            className={"xl:text-4xl text-3xl font-bold"}
            animationNum={0}
            customVariants={revealVariants}
            timelineRef={testimonialRef}
          >
            Trusted by Leading Filipino Brands
          </TimelineContent>
          <TimelineContent
            as="p"
            className={"mx-auto text-gray-500"}
            animationNum={1}
            customVariants={revealVariants}
            timelineRef={testimonialRef}
          >
            See what business owners and entrepreneurs say about BazaarX
          </TimelineContent>
        </article>
        <div className="lg:grid lg:grid-cols-3 gap-2 flex flex-col w-full lg:py-10 pt-10 pb-4 lg:px-10 px-4">
          <div className="md:flex lg:flex-col lg:space-y-2 h-full lg:gap-0 gap-2 ">
            <TimelineContent
              animationNum={0}
              customVariants={revealVariants}
              timelineRef={testimonialRef}
              className="lg:flex-[7] flex-[6] flex flex-col justify-between relative bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden rounded-lg border border-orange-300 p-5"
            >
              <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#ffffff2e_1px,transparent_1px),linear-gradient(to_bottom,#ffffff2e_1px,transparent_1px)] bg-[size:50px_56px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
              <article className="mt-auto relative z-10">
                <p>
                  "BazaarX transformed how we sell online. From 100 to 5,000 orders per month in just 6 months. The platform is built for Filipino businesses!"
                </p>
                <div className="flex justify-between pt-5">
                  <div>
                    <h2 className="font-semibold lg:text-xl text-sm">
                      Patricia Santos
                    </h2>
                    <p className="text-orange-100">CEO of PatSan Fashion</p>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=688&auto=format&fit=crop"
                    alt="Patricia Santos"
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                </div>
              </article>
            </TimelineContent>
            <TimelineContent
              animationNum={1}
              customVariants={revealVariants}
              timelineRef={testimonialRef}
              className="lg:flex-[3] flex-[4] lg:h-fit lg:shrink-0 flex flex-col justify-between relative bg-blue-600 text-white overflow-hidden rounded-lg border border-blue-400 p-5"
            >
              <article className="mt-auto">
                <p>
                  "Best investment for my online store. Real-time analytics helped us triple our revenue!"
                </p>
                <div className="flex justify-between pt-5">
                  <div>
                    <h2 className="font-semibold text-xl">Mark Reyes</h2>
                    <p className="text-blue-100">Founder of TechHub PH</p>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=687&auto=format&fit=crop"
                    alt="Mark Reyes"
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                </div>
              </article>
            </TimelineContent>
          </div>
          <div className="lg:h-full md:flex lg:flex-col h-fit lg:space-y-2 lg:gap-0 gap-2">
            <TimelineContent
              animationNum={2}
              customVariants={revealVariants}
              timelineRef={testimonialRef}
              className="flex flex-col justify-between relative bg-[#111111] text-white overflow-hidden rounded-lg border border-gray-700 p-5"
            >
              <article className="mt-auto">
                <p className="2xl:text-base text-sm">
                  "BazaarX's seller dashboard is incredibly powerful. We manage 10+ product lines effortlessly. Customer support is outstanding!"
                </p>
                <div className="flex justify-between items-end pt-5">
                  <div>
                    <h2 className="font-semibold lg:text-xl text-lg">
                      Ana Gonzales
                    </h2>
                    <p className="lg:text-base text-sm text-gray-400">
                      Owner of Gourmet Manila
                    </p>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=761&auto=format&fit=crop"
                    alt="Ana Gonzales"
                    className="lg:w-16 lg:h-16 w-12 h-12 rounded-xl object-cover"
                  />
                </div>
              </article>
            </TimelineContent>
            <TimelineContent
              animationNum={3}
              customVariants={revealVariants}
              timelineRef={testimonialRef}
              className="flex flex-col justify-between relative bg-[#111111] text-white overflow-hidden rounded-lg border border-gray-700 p-5"
            >
              <article className="mt-auto">
                <p className="2xl:text-base text-sm">
                  "From Cebu to Manila, BazaarX helped us reach customers nationwide. The platform handles everything seamlessly!"
                </p>
                <div className="flex justify-between items-end pt-5">
                  <div>
                    <h2 className="font-semibold lg:text-xl text-lg">
                      Rico Tan
                    </h2>
                    <p className="lg:text-base text-sm text-gray-400">
                      CEO of Island Crafts Co.
                    </p>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=870&auto=format&fit=crop"
                    alt="Rico Tan"
                    className="lg:w-16 lg:h-16 w-12 h-12 rounded-xl object-cover"
                  />
                </div>
              </article>
            </TimelineContent>
            <TimelineContent
              animationNum={4}
              customVariants={revealVariants}
              timelineRef={testimonialRef}
              className="flex flex-col justify-between relative bg-[#111111] text-white overflow-hidden rounded-lg border border-gray-700 p-5"
            >
              <article className="mt-auto">
                <p className="2xl:text-base text-sm">
                  "Switched from another platform to BazaarX - best decision ever! Sales increased 300% in 3 months. Highly recommend!"
                </p>
                <div className="flex justify-between items-end pt-5">
                  <div>
                    <h2 className="font-semibold lg:text-xl text-lg">
                      Carlo Mendoza
                    </h2>
                    <p className="lg:text-base text-sm text-gray-400">
                      Founder of FitLife PH
                    </p>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=687&auto=format&fit=crop"
                    alt="Carlo Mendoza"
                    className="lg:w-16 lg:h-16 w-12 h-12 rounded-xl object-cover"
                  />
                </div>
              </article>
            </TimelineContent>
          </div>
          <div className="h-full md:flex lg:flex-col lg:space-y-2 lg:gap-0 gap-2">
            <TimelineContent
              animationNum={5}
              customVariants={revealVariants}
              timelineRef={testimonialRef}
              className="lg:flex-[3] flex-[4] flex flex-col justify-between relative bg-blue-600 text-white overflow-hidden rounded-lg border border-blue-400 p-5"
            >
              <article className="mt-auto">
                <p>
                  "BazaarX has been a key partner in our growth journey. Couldn't ask for better!"
                </p>
                <div className="flex justify-between pt-5">
                  <div>
                    <h2 className="font-semibold text-xl">Maya Villanueva</h2>
                    <p className="text-blue-100">CEO of BeautyBox Manila</p>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=870&auto=format&fit=crop"
                    alt="Maya Villanueva"
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                </div>
              </article>
            </TimelineContent>
            <TimelineContent
              animationNum={6}
              customVariants={revealVariants}
              timelineRef={testimonialRef}
              className="lg:flex-[7] flex-[6] flex flex-col justify-between relative bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden rounded-lg border border-orange-300 p-5"
            >
              <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#ffffff2e_1px,transparent_1px),linear-gradient(to_bottom,#ffffff2e_1px,transparent_1px)] bg-[size:50px_56px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
              <article className="mt-auto relative z-10">
                <p>
                  "BazaarX revolutionized our business. The AI-powered insights, automated inventory, and exceptional support helped us scale to 15,000+ orders monthly. Truly game-changing!"
                </p>
                <div className="flex justify-between pt-5">
                  <div>
                    <h2 className="font-semibold text-xl">James Cruz</h2>
                    <p className="text-orange-100">CTO of HomeStyle PH</p>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=687&auto=format&fit=crop"
                    alt="James Cruz"
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                </div>
              </article>
            </TimelineContent>
          </div>
        </div>

        <div className="absolute border-b-2 border-[#e6e6e6] bottom-4 h-16 z-[2] md:w-full w-[90%] md:left-0 left-[5%]">
          <div className="container mx-auto w-full h-full relative before:absolute before:-left-2 before:-bottom-2 before:w-4 before:h-4 before:bg-white before:shadow-sm before:border border-gray-200 before:border-gray-300 after:absolute after:-right-2 after:-bottom-2 after:w-4 after:h-4 after:bg-white after:shadow-sm after:border after:border-gray-300 "></div>
        </div>
      </section>
    </main>
  );
}

export default BrandTestimonials;
