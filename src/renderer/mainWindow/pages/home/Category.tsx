import {motion} from 'framer-motion';
import {ReactNode} from 'react';

import CardsContainer from '../CardsContainer';

/**
 * Props for the HomeCategory component.
 */
interface HomeCategoryProps {
  /** The children nodes (usually the list of cards) to strictly render within the category. */
  children: ReactNode;
  /** The icon component to display next to the category title. */
  icon: ReactNode;
  /** The main title of the category (e.g., "PINNED", "RECENTLY USED"). */
  title: string;
  /** An optional subtitle to display under or next to the main title. */
  subTitle?: string;
}

/**
 * A wrapper component that applies animation and standardized layout for a section of cards on the Home page.
 *
 * @param {HomeCategoryProps} props Contains the category title, icon, subtitle, and child elements.
 * @returns {JSX.Element} The animated wrapper surrounding the CardsContainer.
 */
export default function HomeCategory({children, subTitle, icon, title}: HomeCategoryProps) {
  return (
    <motion.div
      transition={{
        duration: 0.18,
        ease: [0.23, 1, 0.32, 1],
      }}
      animate={{opacity: 1, scale: 1, y: 0}}
      exit={{opacity: 0, scale: 0.96, y: 6}}
      className="flex w-full flex-col p-4 py-0"
      initial={{opacity: 0, scale: 0.96, y: 6}}
      layout>
      <CardsContainer icon={icon} title={title} subTitle={subTitle}>
        {children}
      </CardsContainer>
    </motion.div>
  );
}
