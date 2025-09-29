// src/lib/fetchQuizzes.js
import { client } from './sanity.server.js';

export async function fetchAllQuizzes() {
  const query = /* groq */ `
    *[_type == "quiz" && !(_id in path("drafts.**"))] | order(_createdAt desc) {
      _id,
      title,
      "slug": slug.current,
      category->{ _id, title },
      mainImage,
      problemDescription,
      _createdAt
    }
  `;
  
  try {
    const quizzes = await client.fetch(query);
    return quizzes || [];
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return [];
  }
}

export async function fetchQuizBySlug(slug) {
  const query = /* groq */ `
    *[_type == "quiz" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
      _id,
      title,
      "slug": slug.current,
      category->{ _id, title },
      problemDescription,
      hints,
      adCode1,
      mainImage,
      answerImage,
      answerExplanation,
      adCode2,
      closingMessage,
      _createdAt
    }
  `;
  
  try {
    const quiz = await client.fetch(query, { slug });
    return quiz;
  } catch (error) {
    console.error('Error fetching quiz by slug:', error);
    return null;
  }
}

export async function fetchQuizzesByCategory(category) {
  const query = /* groq */ `
    *[_type == "quiz" && !(_id in path("drafts.**")) && ((defined(category._ref) && category->title == $category) || (!defined(category._ref) && category == $category))] | order(_createdAt desc) {
      _id,
      title,
      "slug": slug.current,
      category->{ _id, title },
      mainImage,
      problemDescription,
      _createdAt
    }
  `;
  
  try {
    const quizzes = await client.fetch(query, { category });
    return quizzes || [];
  } catch (error) {
    console.error('Error fetching quizzes by category:', error);
    return [];
  }
}
