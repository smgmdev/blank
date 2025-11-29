import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Shield, Globe, CreditCard, ChevronRight } from "lucide-react";
import heroImage from "@assets/generated_images/premium_metal_credit_card_floating_with_abstract_geometric_shapes.png";

export default function Home() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-background rounded-sm transform rotate-45" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">NOVA</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Personal</a>
            <a href="#" className="hover:text-primary transition-colors">Business</a>
            <a href="#" className="hover:text-primary transition-colors">Wealth</a>
            <a href="#" className="hover:text-primary transition-colors">Company</a>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden md:flex hover:text-primary hover:bg-transparent">
              Log in
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-full px-6">
              Open Account
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div 
            initial="initial"
            animate="animate"
            variants={stagger}
            className="flex flex-col gap-6"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-xs font-medium tracking-wide text-primary uppercase">Future of Banking</span>
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="text-5xl lg:text-7xl font-display font-bold leading-[1.1] tracking-tighter">
              Banking for the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">
                New Era.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Experience financial freedom with the world's most advanced banking platform. Zero fees. Infinite possibilities.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex items-center gap-4 pt-4">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 rounded-full text-base font-semibold group">
                Get Started 
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 rounded-full text-base hover:bg-white/5 border-white/10">
                View Demo
              </Button>
            </motion.div>

            <motion.div variants={fadeInUp} className="pt-12 flex items-center gap-8 text-muted-foreground">
              <div>
                <p className="text-3xl font-display font-bold text-white">2M+</p>
                <p className="text-sm">Active Users</p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div>
                <p className="text-3xl font-display font-bold text-white">$50B+</p>
                <p className="text-sm">Transactions</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border border-white/10 glass-panel p-2">
               <img 
                src={heroImage} 
                alt="Premium Metal Card" 
                className="w-full h-auto rounded-2xl transform hover:scale-105 transition-transform duration-700"
              />
            </div>
            
            {/* Floating Elements */}
            <motion.div 
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-10 -right-10 p-4 glass-panel rounded-2xl z-20 max-w-[200px]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="font-bold text-sm">+$12,450.00</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 20, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-10 -left-10 p-4 glass-panel rounded-2xl z-20 max-w-[200px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Global Transfer</p>
                  <p className="font-bold text-sm">Complete</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-white/2">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-display font-bold mb-4">Designed for the <span className="text-primary">future</span></h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Everything you need to manage your wealth, built into one beautiful interface.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Bank-Grade Security",
                desc: "Your assets are protected by military-grade encryption and biometric authentication."
              },
              {
                icon: Globe,
                title: "Global Access",
                desc: "Spend anywhere in the world with zero foreign transaction fees and real-time exchange rates."
              },
              {
                icon: CreditCard,
                title: "Premium Metal Cards",
                desc: "Stand out with our signature matte black steel cards, laser-etched with precision."
              }
            ].map((feature, i) => (
              <Card key={i} className="bg-card/50 border-white/5 hover:border-primary/50 transition-colors group cursor-pointer">
                <CardContent className="p-8">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-display">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                  <div className="mt-6 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                    Learn more <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
