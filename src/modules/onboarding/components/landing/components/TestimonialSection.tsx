import { motion } from 'framer-motion';

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatarInitials: string;
}

interface TestimonialSectionProps {
  testimonials?: Testimonial[];
}

const defaultTestimonials: Testimonial[] = [
  {
    name: '[Nome]',
    role: 'Coach Esportivo \u2022 Modulo Flux',
    quote: 'Depoimento em breve \u2014 estamos coletando feedback dos primeiros usuarios.',
    avatarInitials: '?',
  },
];

export function TestimonialSection({ testimonials = defaultTestimonials }: TestimonialSectionProps) {
  const isPlaceholder = testimonials === defaultTestimonials || testimonials[0]?.name === '[Nome]';

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-black text-ceramic-text-primary mb-4 tracking-tighter">
          Quem ja usa
        </h2>
        <p className="text-lg text-ceramic-text-secondary font-medium uppercase tracking-widest opacity-60">
          Feedback dos primeiros usuarios
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-6">
        {testimonials.map((t, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 * index }}
            className={`max-w-md w-full p-8 ceramic-card border-l-4 ${
              isPlaceholder
                ? 'border-l-ceramic-text-secondary/20 opacity-60'
                : 'border-l-amber-500'
            }`}
          >
            <div className="flex items-center gap-4 mb-5">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg ${
                  isPlaceholder
                    ? 'bg-ceramic-text-secondary/30'
                    : 'bg-gradient-to-br from-amber-400 to-amber-600'
                }`}
              >
                {t.avatarInitials}
              </div>
              <div>
                <p className="font-black text-ceramic-text-primary tracking-tight">{t.name}</p>
                <p className="text-xs text-ceramic-text-secondary">{t.role}</p>
              </div>
            </div>
            <p className="text-sm text-ceramic-text-primary italic leading-relaxed">
              &ldquo;{t.quote}&rdquo;
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
