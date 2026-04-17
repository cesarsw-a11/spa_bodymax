import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type ServiceSeed = {
  name: string;
  description: string;
  price: string;
  durationMin: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  imageUrl: string;
  nameEn: string;
  descriptionEn: string;
};

const servicesSeed: ServiceSeed[] = [
  {
    name: "Combo Body Max",
    description:
      "Nuestro masaje insignia que integra tecnicas relajantes, estiramientos y tejido profundo en una sola sesion. Disenado especialmente para liberar la rigidez acumulada por estres, las largas horas frente a la computadora y la tension del dia.\n\nA traves de una combinacion equilibrada de tecnicas el cuerpo se relaja, recupera movilidad y libera profundamente la tension, brindando una sensacion de ligereza, descanso y bienestar integral.",
    price: "800.00",
    durationMin: 90,
    active: true,
    createdAt: new Date("2026-03-24T18:19:39.803Z"),
    updatedAt: new Date("2026-04-02T14:41:00.774Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1774728236012-226c251c-ab7e-48a0-86c6-66b5f6e44577.webp",
    nameEn: "Hot Obsidian Stone Massage",
    descriptionEn:
      "Our signature massage integrates relaxing techniques, stretching, and deep tissue work in a single session. Specially designed to release stiffness caused by stress, long hours in front of a computer, and daily tension.\n\nThrough a balanced combination of techniques, the body relaxes, restores mobility, and deeply releases tension, providing a feeling of lightness, rest, and overall well-being.",
  },
  {
    name: "Tejido Profundo",
    description:
      "El masaje de tejido profundo esta disenado para liberar tensiones acumuladas en las capas mas profundas de la musculatura. A traves de tecnicas firmes y controladas, ayuda a disminuir contracturas, mejorar la movilidad y aliviar molestias causadas por el estres o la actividad fisica.\n\nEs ideal para quienes buscan un trabajo mas enfocado y efectivo en zonas de tension, logrando una sensacion de alivio, ligereza y bienestar duradero",
    price: "800.00",
    durationMin: 90,
    active: true,
    createdAt: new Date("2026-03-28T19:08:40.389Z"),
    updatedAt: new Date("2026-04-02T14:45:38.849Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1774724920098-2d1bcf41-124a-4cd8-a462-7334388540bc.jpeg",
    nameEn: "Deep Tissue Massage",
    descriptionEn:
      "Deep tissue massage is designed to release accumulated tension in the deeper layers of the musculature. Through firm and controlled techniques, it helps reduce muscle tightness, improve mobility, and relieve discomfort caused by stress or physical activity.\n\nIt is ideal for those seeking a more focused and effective treatment on areas of tension, promoting a lasting sense of relief, lightness, and overall well-being.",
  },
  {
    name: "Masaje Terapeutico",
    description:
      "Un masaje enfocado en aliviar molestias especificas del cuerpo a traves de tecnicas personalizadas. Ideal para tratar tension localizada, contracturas y desequilibrios musculares derivados del estres o la actividad diaria.\n\nCada sesion se adapta a tus necesidades, ayudando a reducir el dolor, mejora la movilidad y restaurar el bienestar fisico de manera efectiva.",
    price: "800.00",
    durationMin: 90,
    active: true,
    createdAt: new Date("2026-03-29T00:19:41.661Z"),
    updatedAt: new Date("2026-04-02T14:49:37.587Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1774744238063-f4c83687-094c-478e-a517-5b57bf9738dc.jpeg",
    nameEn: "Therapeutic Massage",
    descriptionEn:
      "A massage focused on relieving specific areas of discomfort through personalized techniques. Ideal for treating localized tension, muscle tightness, and imbalances caused by stress or daily activities.\n\nEach session is tailored to your needs, helping to reduce pain, improve mobility, and effectively restore physical well-being.",
  },
  {
    name: "Drenaje Linfatico Manual",
    description:
      "Considerado por excelencia uno de los masajes mas efectivos para desinflamar el cuerpo, esta tecnica suave y ritmica estimula el sistema linfatico, ayudando a eliminar liquidos retenidos, reducir la inflamacion y mejorar la circulacion.\n\nIdeal para quienes buscan sentirse mas ligeros, desinflamados y en equilibrio, promoviendo un bienestar profundo desde el interior del cuerpo",
    price: "800.00",
    durationMin: 90,
    active: true,
    createdAt: new Date("2026-03-29T18:59:38.150Z"),
    updatedAt: new Date("2026-04-02T14:43:25.662Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1774984995876-39879a7c-b0bd-4541-a10e-a662d45e93d7.jpg",
    nameEn: "Manual Lymphatic Drainage",
    descriptionEn:
      "Considered one of the most effective treatments for reducing inflammation, this gentle and rhythmic technique stimulates the lymphatic system, helping to eliminate retained fluids, reduce swelling, and improve circulation.\n\nIdeal for those seeking to feel lighter, less bloated, and more balanced, promoting a deep sense of well-being from within the body",
  },
  {
    name: "Piedras Calientes de obsidiana",
    description:
      "Una experiencia elevada que fusiona el calor de las piedras de obsidiana con tecnicas terapeuticas refinadas, disenada para liberar la tension, mejorar la circulacion y restaurar un profundo estado de relajacion y equilibrio.\n\nIdeal para quienes buscan desconectar, soltar el estres y reconectar con una renovada sensacion de energia y bienestar.",
    price: "1000.00",
    durationMin: 90,
    active: true,
    createdAt: new Date("2026-03-31T18:31:30.624Z"),
    updatedAt: new Date("2026-03-31T19:00:29.514Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1774983629085-53b2ea0c-991d-49a7-84bf-03c9b7de5772.jpg",
    nameEn: "Hot Obsidian Stone Massage",
    descriptionEn:
      "An elevated experience that blends the warmth of obsidian stones with refined therapeutic techniques, designed to melt away tension, enhance circulation, and restore a deep sense of relaxation and balance.\n\nIdeal for those seeking to disconnect, release stress, and reconnect with a renewed sense of energy and well-being.",
  },
  {
    name: "Masaje Relajante Corporal",
    description:
      "Una experiencia disenada para calmar el cuerpo y la mente a traves de movimientos suaves y envolventes. Ayuda a liberar el estres acumulado, relajar la musculatura y promover un estado profundo de descanso.\n\nIdeal para quienes buscan desconectar, equilibrarse y disfrutar de un momento de bienestar total.",
    price: "800.00",
    durationMin: 90,
    active: true,
    createdAt: new Date("2026-04-02T16:17:27.818Z"),
    updatedAt: new Date("2026-04-02T16:17:27.818Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1775146647254-2e7e4dfc-4bc1-4784-91a4-89c6f278c66b.jpeg",
    nameEn: "Relaxing Massage",
    descriptionEn:
      "An experience designed to calm both body and mind through gentle, flowing movements. It helps release accumulated stress, relax the muscles, and promote a deep state of rest.\n\nIdeal for those seeking to disconnect, rebalance, and enjoy a moment of complete well-being.",
  },
  {
    name: "Masaje Sueco",
    description:
      "Una experiencia refinada y profundamente relajante que combina movimientos suaves y fluidos con tecnicas ritmicas para liberar la tension y promover el bienestar general. Disenado para mejorar la circulacion, relajar el cuerpo y calmar la mente, creando un equilibrio perfecto entre relajacion y trabajo terapeutico suave.\n\nIdeal para quienes buscan una experiencia clasica y reconfortante que restaure la armonia, la ligereza y una renovada sensacion de calma.",
    price: "700.00",
    durationMin: 70,
    active: true,
    createdAt: new Date("2026-04-02T16:26:08.942Z"),
    updatedAt: new Date("2026-04-02T16:44:54.341Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1775148293723-cf494bfe-7a57-4586-be8b-5751d0dcc7e8.webp",
    nameEn: "Swedish Massage",
    descriptionEn:
      "A refined and deeply relaxing experience that combines smooth, flowing techniques with rhythmic movements to ease tension and promote overall well-being. Designed to improve circulation, relax the body, and calm the mind, this massage creates a perfect balance between relaxation and gentle therapeutic work.\n\nIdeal for those seeking a classic, soothing experience that restores harmony, lightness, and a renewed sense of calm.",
  },
  {
    name: "Bambuterapia (Masajearnos de Bambu)",
    description:
      "Bambuterapia\n\nUna tecnica que utiliza canas de bambu para trabajar la musculatura a profundidad, liberando tension, mejorando la circulacion y promoviendo una sensacion de bienestar integral.\n\nIdeal para quienes buscan una experiencia diferente que combine relajacion y trabajo muscular efectivo.",
    price: "800.00",
    durationMin: 90,
    active: true,
    createdAt: new Date("2026-04-02T17:33:54.656Z"),
    updatedAt: new Date("2026-04-02T17:33:54.656Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1775151234039-17e1c9f3-447f-4b25-94f4-30a7cf3e6d2c.jpeg",
    nameEn: "Bamboo Therapy",
    descriptionEn:
      "Bamboo Therapy\n\nA refined experience that incorporates bamboo canes with expert techniques to deeply stimulate the muscles, melt away tension, and enhance circulation. The rhythmic and flowing movements create a perfect balance between relaxation and therapeutic work.\n\nIdeal for those seeking a unique, restorative treatment that leaves the body feeling lighter, revitalized, and in complete harmony.",
  },
  {
    name: "Masaje Prenatal",
    description:
      "Una experiencia delicadamente disenada para acompanar y cuidar el bienestar de la mujer durante el embarazo. A traves de tecnicas suaves y seguras, ayuda a aliviar la tension, reducir la inflamacion y brindar una profunda sensacion de calma y confort.\n\nUn momento especial para reconectar con tu cuerpo, relajarte y disfrutar de una sensacion de bienestar integral en esta etapa tan significativa.",
    price: "600.00",
    durationMin: 60,
    active: true,
    createdAt: new Date("2026-04-02T17:53:43.637Z"),
    updatedAt: new Date("2026-04-02T18:01:07.557Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1775152866817-734b8ba2-b93a-48ae-912d-105eacbd14d8.jpeg",
    nameEn: "Prenatal Massage",
    descriptionEn:
      "A delicately designed experience to support and nurture a woman's well-being during pregnancy. Through gentle and safe techniques, it helps relieve tension, reduce swelling, and provide a deep sense of calm and comfort.\n\nA special moment to reconnect with your body, relax, and enjoy a feeling of complete well-being during this meaningful stage.",
  },
  {
    name: "Masaje Infantil",
    description:
      "Una experiencia disenada especialmente para el bienestar de los mas pequenos, a traves de tecnicas suaves y seguras que ayudan a relajar el cuerpo, liberar tensiones y promover un estado de calma.\n\nIdeal para ninos que necesitan relajarse, mejorar su descanso y disfrutar de un momento de cuidado en un ambiente tranquilo y seguro.",
    price: "400.00",
    durationMin: 60,
    active: true,
    createdAt: new Date("2026-04-02T18:16:05.645Z"),
    updatedAt: new Date("2026-04-02T18:16:05.645Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1775153765063-3776c350-c1d1-438b-a2ab-bc41286ebff3.jpeg",
    nameEn: "Kids Massage",
    descriptionEn:
      "Kids Massage\n\nA gentle experience specially designed for children's well-being. Through soft and safe techniques, it helps relax the body, release tension, and promote a calm and balanced state.\n\nIdeal for children who need to unwind, improve their rest, and enjoy a moment of care in a peaceful and safe environment.",
  },
  {
    name: "Teen Balance",
    description:
      "Una experiencia disenada especialmente para adolescentes, enfocada en aliviar la tension acumulada por el estres, el uso constante de dispositivos y las exigencias del dia a dia. A traves de tecnicas suaves y equilibradas, ayuda a relajar el cuerpo, mejorar la postura y promover un estado de calma y bienestar.\n\nIdeal para quienes buscan desconectar, sentirse mas ligeros y recuperar el equilibrio fisico y mental.",
    price: "450.00",
    durationMin: 55,
    active: true,
    createdAt: new Date("2026-04-06T23:06:13.958Z"),
    updatedAt: new Date("2026-04-08T21:01:43.983Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1775681906514-91ba7f00-ed8f-4b1a-adf2-16fdfd671271.jpeg",
    nameEn: "Teen Balance",
    descriptionEn:
      "A wellness experience specially designed for teenagers, focused on relieving tension caused by stress, constant use of digital devices, and the demands of daily life. Through gentle and balanced techniques, it helps relax the body, improve posture, and promote a sense of calm and well-being.\n\nIdeal for those seeking to disconnect, feel lighter, and restore physical and mental balance.",
  },
  {
    name: "Limpieza Facial Profunda",
    description:
      "Un tratamiento esencial que purifica la piel en profundidad, devolviendole frescura, equilibrio y luminosidad. Disenado para todo tipo de piel y todas las edades, trabaja cuidadosamente para eliminar impurezas, comedones y celulas muertas, revelando un cutis mas limpio y renovado.\n\nA traves de una experiencia delicada y personalizada, la piel recupera su vitalidad natural, luciendo mas saludable, suave y radiante.",
    price: "600.00",
    durationMin: 80,
    active: true,
    createdAt: new Date("2026-04-06T23:09:11.636Z"),
    updatedAt: new Date("2026-04-08T21:01:08.329Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1775682067963-4c863e6c-5242-4b9b-9c08-70f444b96c8c.jpeg",
    nameEn: "Deep Cleansing Facial",
    descriptionEn:
      "An essential treatment that deeply purifies the skin, restoring freshness, balance, and natural radiance. Designed for all skin types and all ages, it works carefully to remove impurities, comedones, and dead skin cells, revealing a cleaner and renewed complexion.\n\nThrough a delicate and personalized experience, the skin regains its natural vitality, leaving it feeling healthier, smoother, and visibly radiant.",
  },
  {
    name: "Facial Hidratante / Nutritivo",
    description:
      "Una experiencia disenada para restaurar la hidratacion y nutrir profundamente la piel, devolviendole suavidad, luminosidad y vitalidad. Ideal para quienes buscan contrarrestar los efectos del sol, el ambiente y el paso del tiempo.\n\nDespues de una limpieza profunda, la piel se prepara para recibir activos concentrados que penetran delicadamente, proporcionando nutricion intensa y un efecto revitalizante inmediato.\n\nEl resultado es un cutis mas flexible, radiante y visiblemente renovado.",
    price: "800.00",
    durationMin: 80,
    active: true,
    createdAt: new Date("2026-04-06T23:15:53.942Z"),
    updatedAt: new Date("2026-04-06T23:15:53.942Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1775517353450-9413a1ea-a1c6-42be-b9e9-b34352e26078.jpeg",
    nameEn: "Hydrating / Nourishing Facial",
    descriptionEn:
      "A refined experience designed to restore hydration and deeply nourish the skin, bringing back softness, radiance, and vitality. Ideal for those looking to counteract the effects of sun exposure, environmental factors, and the passage of time.\n\nFollowing a deep cleansing, the skin is prepared to receive concentrated active ingredients that are delicately absorbed, delivering intense nourishment and an immediate revitalizing effect.\n\nThe result is a more supple, radiant, and visibly renewed complexion.",
  },
  {
    name: "facial Integral",
    description:
      "La experiencia facial mas completa y exclusiva de nuestro spa, disenada para regenerar, hidratar y nutrir la piel en profundidad. Inicia con una limpieza profunda que prepara el cutis para recibir una cuidadosa seleccion de activos concentrados, incluyendo ampolleta de colageno y ampolletas personalizadas segun las necesidades de tu piel.\n\nEstos activos se integran a traves de un velo de colageno de alta calidad, potenciando su absorcion y brindando un efecto intensivo, restaurador y visible desde la primera sesion.\n\nEl resultado es una piel mas firme, luminosa y profundamente renovada, revelando un rostro radiante, saludable y lleno de vitalidad.",
    price: "1500.00",
    durationMin: 90,
    active: true,
    createdAt: new Date("2026-04-08T16:22:35.007Z"),
    updatedAt: new Date("2026-04-08T16:22:35.007Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1775665354295-2a7fdc02-6e66-40e8-84bd-fd9a8b9781c4.jpeg",
    nameEn: "Integral Facial",
    descriptionEn:
      "The most complete and exclusive facial experience in our spa, designed to deeply regenerate, hydrate, and nourish the skin. It begins with a deep cleansing that prepares the complexion to receive a carefully selected blend of concentrated actives, including a collagen ampoule and personalized ampoules tailored to your skin's needs.\n\nThese actives are infused through a high-quality collagen veil, enhancing absorption and delivering an intensive, restorative effect visible from the very first session.\n\nThe result is firmer, more radiant, and deeply renewed skin, revealing a healthy, luminous complexion full of vitality.",
  },
  {
    name: "Pestanas & Cejas",
    description:
      "Realza tu mirada de forma natural y elegante con tratamientos disenados para resaltar tu expresion y armonizar tu rostro. Cada servicio es personalizado para lograr un resultado sutil, definido y acorde a tu estilo.",
    price: "1.00",
    durationMin: 60,
    active: true,
    createdAt: new Date("2026-04-08T17:30:25.102Z"),
    updatedAt: new Date("2026-04-08T17:30:25.102Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1775669424380-fb761d19-8e55-424f-baf5-67ca10f8b812.jpeg",
    nameEn: "Lashes & Brows",
    descriptionEn:
      "Enhance your natural beauty with treatments designed to highlight your expression and bring harmony to your features. Each service is personalized to achieve a refined, defined look that complements your unique style.",
  },
  {
    name: "Extensiones de Pestanas",
    description:
      "Una tecnica disenada para aportar longitud, volumen y definicion a tus pestanas, creando una mirada mas expresiva sin necesidad de maquillaje. Cada aplicacion se adapta a tu estilo, logrando un resultado natural o mas intenso segun tu preferencia.",
    price: "1.00",
    durationMin: 60,
    active: true,
    createdAt: new Date("2026-04-08T17:34:33.907Z"),
    updatedAt: new Date("2026-04-08T17:34:33.907Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1775669672653-b215a85e-8c2f-4e28-8b8b-73530408ce7d.jpeg",
    nameEn: "Eyelash Extensions",
    descriptionEn:
      "A technique designed to add length, volume, and definition to your lashes, creating a more expressive look without the need for daily makeup. Each application is tailored to your preference, achieving a natural or more dramatic result.",
  },
  {
    name: "Laminado de Cejas con Diseno",
    description:
      "Un tratamiento que alinea, fija y define el vello de las cejas, complementado con un diseno personalizado que armoniza tus facciones. El resultado son cejas mas ordenadas, con mayor volumen y un acabado limpio y elegante.",
    price: "1.00",
    durationMin: 60,
    active: true,
    createdAt: new Date("2026-04-08T17:52:57.578Z"),
    updatedAt: new Date("2026-04-08T17:52:57.578Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1775670776970-27062a8e-8d7a-4bab-ad36-40c7977f5f7e.jpeg",
    nameEn: "Brow Lamination with Shaping",
    descriptionEn:
      "A treatment that smooths, sets, and defines the brow hairs, combined with a personalized shaping to enhance your natural features. The result is fuller, more structured brows with a clean and polished finish.",
  },
  {
    name: "Lash Lifting",
    description:
      "Lifting de Pestanas\n\nUn tratamiento que eleva y curva tus pestanas naturales, creando una mirada mas abierta, definida y elegante sin necesidad de extensiones.\n\nIdeal para quienes buscan un efecto natural, con mayor expresion y bajo mantenimiento.",
    price: "1000.00",
    durationMin: 60,
    active: true,
    createdAt: new Date("2026-04-08T20:17:50.196Z"),
    updatedAt: new Date("2026-04-08T20:17:50.196Z"),
    imageUrl:
      "https://dyblwivu28iaj5qg.public.blob.vercel-storage.com/services/1775679469802-489a910e-7b38-43e9-a986-83a5bfb6e493.jpeg",
    nameEn: "Lash Lifting",
    descriptionEn:
      "A treatment that lifts and enhances your natural lashes, creating a more open, defined, and elegant look without the need for extensions.\n\nIdeal for those seeking a natural effect with enhanced expression and low maintenance.",
  },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@spabodymax.com";
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";

  const hashed = await bcrypt.hash(adminPass, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: "Admin", email: adminEmail, password: hashed, role: "ADMIN" },
  });

  const addonCount = await prisma.addon.count();
  if (addonCount === 0) {
    await prisma.addon.create({
      data: {
        name: "Piedras calientes",
        price: "120.00",
        active: true,
        createdAt: new Date("2026-03-24T18:24:44.098Z"),
        updatedAt: new Date("2026-03-24T18:24:44.098Z"),
      },
    });
  }

  const blockedSlotCount = await prisma.blockedSlot.count();
  if (blockedSlotCount === 0) {
    await prisma.blockedSlot.create({
      data: {
        start: new Date("2026-03-26T12:26:00Z"),
        end: new Date("2026-03-26T13:26:00Z"),
        reason: "",
        createdAt: new Date("2026-03-24T18:26:18.698Z"),
        updatedAt: new Date("2026-03-24T18:26:18.698Z"),
      },
    });
  }

  const serviceCount = await prisma.service.count();
  if (serviceCount === 0) {
    await prisma.service.createMany({
      data: servicesSeed,
    });
  }

  const serviceVariantCount = await prisma.serviceVariant.count();
  if (serviceVariantCount === 0) {
    const services = await prisma.service.findMany({
      select: { id: true, name: true },
    });
    const serviceIdByName = new Map(services.map((service) => [service.name, service.id]));
    const variantsByService: Array<{
      serviceName: string;
      durationMin: number;
      price: string;
      createdAt: Date;
      updatedAt: Date;
    }> = [
      {
        serviceName: "Tejido Profundo",
        durationMin: 90,
        price: "800.00",
        createdAt: new Date("2026-03-29T04:26:24.373Z"),
        updatedAt: new Date("2026-04-02T14:41:00.827Z"),
      },
      {
        serviceName: "Masaje Terapeutico",
        durationMin: 90,
        price: "800.00",
        createdAt: new Date("2026-03-29T04:26:24.373Z"),
        updatedAt: new Date("2026-04-02T14:49:37.658Z"),
      },
      {
        serviceName: "Drenaje Linfatico Manual",
        durationMin: 90,
        price: "800.00",
        createdAt: new Date("2026-03-29T18:59:38.169Z"),
        updatedAt: new Date("2026-04-02T14:43:25.729Z"),
      },
      {
        serviceName: "Piedras Calientes de obsidiana",
        durationMin: 90,
        price: "1000.00",
        createdAt: new Date("2026-03-31T18:31:30.647Z"),
        updatedAt: new Date("2026-03-31T19:00:29.807Z"),
      },
      {
        serviceName: "Masaje Relajante Corporal",
        durationMin: 90,
        price: "800.00",
        createdAt: new Date("2026-04-02T16:17:27.844Z"),
        updatedAt: new Date("2026-04-02T16:17:27.844Z"),
      },
      {
        serviceName: "Masaje Sueco",
        durationMin: 70,
        price: "700.00",
        createdAt: new Date("2026-04-02T16:26:08.962Z"),
        updatedAt: new Date("2026-04-02T16:44:54.390Z"),
      },
      {
        serviceName: "Bambuterapia (Masajearnos de Bambu)",
        durationMin: 90,
        price: "800.00",
        createdAt: new Date("2026-04-02T17:33:54.678Z"),
        updatedAt: new Date("2026-04-02T17:33:54.678Z"),
      },
      {
        serviceName: "Masaje Prenatal",
        durationMin: 60,
        price: "600.00",
        createdAt: new Date("2026-04-02T17:53:43.662Z"),
        updatedAt: new Date("2026-04-02T18:01:07.600Z"),
      },
      {
        serviceName: "Masaje Infantil",
        durationMin: 60,
        price: "400.00",
        createdAt: new Date("2026-04-02T18:16:05.665Z"),
        updatedAt: new Date("2026-04-02T18:16:05.665Z"),
      },
      {
        serviceName: "Teen Balance",
        durationMin: 55,
        price: "450.00",
        createdAt: new Date("2026-04-06T23:06:13.984Z"),
        updatedAt: new Date("2026-04-08T21:01:43.999Z"),
      },
      {
        serviceName: "Limpieza Facial Profunda",
        durationMin: 80,
        price: "600.00",
        createdAt: new Date("2026-04-06T23:09:11.649Z"),
        updatedAt: new Date("2026-04-08T21:01:08.358Z"),
      },
      {
        serviceName: "Facial Hidratante / Nutritivo",
        durationMin: 80,
        price: "800.00",
        createdAt: new Date("2026-04-06T23:15:53.961Z"),
        updatedAt: new Date("2026-04-06T23:15:53.961Z"),
      },
      {
        serviceName: "facial Integral",
        durationMin: 90,
        price: "1500.00",
        createdAt: new Date("2026-04-08T16:22:35.024Z"),
        updatedAt: new Date("2026-04-08T16:22:35.024Z"),
      },
      {
        serviceName: "Pestanas & Cejas",
        durationMin: 60,
        price: "1.00",
        createdAt: new Date("2026-04-08T17:30:25.121Z"),
        updatedAt: new Date("2026-04-08T17:30:25.121Z"),
      },
      {
        serviceName: "Extensiones de Pestanas",
        durationMin: 60,
        price: "1.00",
        createdAt: new Date("2026-04-08T17:34:33.941Z"),
        updatedAt: new Date("2026-04-08T17:34:33.941Z"),
      },
      {
        serviceName: "Laminado de Cejas con Diseno",
        durationMin: 60,
        price: "1.00",
        createdAt: new Date("2026-04-08T17:52:57.596Z"),
        updatedAt: new Date("2026-04-08T17:52:57.596Z"),
      },
      {
        serviceName: "Lash Lifting",
        durationMin: 60,
        price: "1000.00",
        createdAt: new Date("2026-04-08T20:17:50.210Z"),
        updatedAt: new Date("2026-04-08T20:17:50.210Z"),
      },
    ];

    await prisma.serviceVariant.createMany({
      data: variantsByService
        .map((variant) => {
          const serviceId = serviceIdByName.get(variant.serviceName);
          if (!serviceId) {
            return null;
          }
          return {
            serviceId,
            durationMin: variant.durationMin,
            price: variant.price,
            active: true,
            sortOrder: 0,
            label: null,
            labelEn: null,
            createdAt: variant.createdAt,
            updatedAt: variant.updatedAt,
          };
        })
        .filter((variant): variant is NonNullable<typeof variant> => variant !== null),
    });
  }

  const bookingCount = await prisma.booking.count();
  if (bookingCount === 0) {
    const service = await prisma.service.findFirst({
      where: { name: "Tejido Profundo" },
      select: { id: true },
    });
    if (service) {
      const variant = await prisma.serviceVariant.findFirst({
        where: { serviceId: service.id },
        orderBy: { id: "asc" },
        select: { id: true },
      });

      await prisma.booking.create({
        data: {
          customer: "Cesar",
          phone: "1000000000",
          email: "pruebas@hotmail.es",
          serviceId: service.id,
          date: new Date("2026-03-24T19:21:00Z"),
          endDate: new Date("2026-03-24T20:21:00Z"),
          price: "550.00",
          status: "CONFIRMED",
          notes: "Sin notas",
          createdAt: new Date("2026-03-24T18:23:04.428Z"),
          updatedAt: new Date("2026-03-24T18:23:37.793Z"),
          addonsJson: null,
          stripePaymentIntentId: "pi_3TEZc0AEXV3C9PXr0OdO3rQL",
          serviceVariantId: variant?.id ?? null,
        },
      });
    }
  }
}

main().finally(async () => prisma.$disconnect());
