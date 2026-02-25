// web/src/components/ui/reveal-images.tsx
import { cn } from "@/lib/utils";
import { motion, type MotionStyle } from "framer-motion";

export interface ImageSource { src: string; alt?: string; }
interface ShowImageListItemProps {
  text: string;
  images: [ImageSource, ImageSource];
  isActive?: boolean;
  className?: string;
  style?: MotionStyle;
}

export function RevealImageListItem({ text, images, isActive = false, className, style }: ShowImageListItemProps) {
  if (!images || images.length < 2) {
    return (
      <div className="group relative h-fit w-fit overflow-visible py-6">
        <motion.h1 className="text-6xl sm:text-7xl font-black text-foreground">{text}</motion.h1>
      </div>
    );
  }

  const containerBack = "absolute right-12 -top-12 z-30 h-40 w-32 md:right-24 md:-top-16 md:h-64 md:w-48";
  const containerFront = "absolute right-2 top-2 z-40 h-40 w-32 md:right-8 md:top-4 md:h-64 md:w-48";

  const activeEffect = isActive ? "scale-100 opacity-100 w-full h-full shadow-xl" : "scale-0 opacity-0 w-20 h-20 md:w-28 md:h-28 shadow-none";

  const effectBase = "relative duration-500 delay-100 overflow-hidden transition-all rounded-md"; // removed defaults that change

  return (
    <div className="group relative h-fit w-fit overflow-visible py-6">
      <motion.h1
        style={style}
        className={cn(
          "text-7xl sm:text-8xl md:text-9xl font-bold text-accent transition-all duration-500 leading-tight font-fondamento",
          isActive ? "opacity-40" : "group-hover:opacity-40",
          className
        )}>
        {text}
      </motion.h1>

      {/* Back preview — sits slightly above/behind */}
      <div className={containerBack}>
        <div className={cn(
          effectBase,
          activeEffect,
          isActive && "scale-105 opacity-90"
        )}>
          <img
            alt={images[1]?.alt ?? ""}
            src={images[1]?.src ?? "/placeholder.svg"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </div>

      {/* Front preview */}
      <div
        className={cn(
          containerFront,
          "translate-x-0 translate-y-0 rotate-0 transition-all delay-150 duration-500",
          isActive ? "translate-x-10 translate-y-10 rotate-12" : "group-hover:translate-x-10 group-hover:translate-y-10 group-hover:rotate-12"
        )}
      >
        <div className={cn(effectBase, activeEffect, "duration-200")}>
          <img
            alt={images[0]?.alt ?? ""}
            src={images[0]?.src ?? "/placeholder.svg"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}

export function RevealImageList() {
  const items: ShowImageListItemProps[] = [
    {
      text: "Branding",
      images: [
        { src: "https://images.unsplash.com/photo-1512295767273-ac109ac3acfa?w=200&q=60", alt: "Image 1" },
        { src: "https://images.unsplash.com/photo-1567262439850-1d4dc1fefdd0?w=200&q=60", alt: "Image 2" },
      ],
    },
    {
      text: "Web design",
      images: [
        { src: "https://images.unsplash.com/photo-1587440871875-191322ee64b0?w=200&q=60", alt: "Image 1" },
        { src: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=200&q=60", alt: "Image 2" },
      ],
    },
    {
      text: "Illustration",
      images: [
        { src: "https://images.unsplash.com/photo-1575995872537-3793d29d972c?w=200&q=60", alt: "Image 1" },
        { src: "https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=200&q=60", alt: "Image 2" },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-1 rounded-sm bg-background px-8 py-4">
      {items.map((item, index) => (
        <RevealImageListItem key={index} text={item.text} images={item.images} />
      ))}
    </div>
  );
}

export default RevealImageList;