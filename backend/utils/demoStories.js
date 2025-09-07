/**
 * Demo stories for testing StoryMill functionality
 */

const demoStories = [
  {
    title: "The Clever Village Girl",
    text: "Once upon a time in a quiet village in Nepal, there lived a clever little girl named Maya. She had long braided hair and wore a beautiful red dress. One day, a mischievous monkey came to the village and started stealing fruit from the market. The villagers were upset and didn't know what to do. Maya watched the monkey carefully and noticed it looked hungry and scared. Instead of chasing it away, she gently offered the monkey some of her own fruit. The monkey was so grateful that it became her friend and helped protect the village from other troubles. From that day on, Maya and the monkey worked together to help everyone in the village."
  },
  {
    title: "The Magic Forest Adventure",
    text: "In a magical forest far away, a brave young boy named Sam discovered a hidden treasure chest. The forest was filled with tall green trees and colorful flowers. Sam wore a blue shirt and had curly brown hair. As he opened the chest, golden light poured out and revealed a map to an ancient castle. Along the way, he met a wise old owl who became his guide. Together they traveled through the enchanted forest, crossed a sparkling river, and finally reached the castle where they found the greatest treasure of all - the power to help others."
  },
  {
    title: "The Kind Shepherd's Gift",
    text: "High in the mountains lived a kind shepherd named Elena who cared for all the animals. She had gentle eyes and wore a warm woolen cloak. Every day, she would lead her sheep to the green meadows and make sure they were safe and happy. One winter day, a terrible storm came and many animals in the forest were cold and hungry. Elena opened her home to all the creatures - rabbits, deer, and even a family of bears. Her kindness created such warmth that the storm passed quickly, and spring came early to the mountains. All the animals remembered her generosity and helped her care for the sheep for many years to come."
  }
];

/**
 * Get a random demo story
 */
const getRandomDemoStory = () => {
  return demoStories[Math.floor(Math.random() * demoStories.length)];
};

/**
 * Get all demo stories
 */
const getAllDemoStories = () => {
  return demoStories;
};

module.exports = {
  demoStories,
  getRandomDemoStory,
  getAllDemoStories
};