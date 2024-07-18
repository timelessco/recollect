import axios from "axios";
import { type Promise } from "cypress/types/cy-bluebird";

// import { createWorker } from "tesseract.js";

import { OCR_URL } from "../../utils/constants";

// /**
//  * Gives the OCR string by calling the OCR library
//  *
//  * @param {string} imageUrl - the image url for the OCR to take places
//  * @returns {Promise<string>} - the OCR value
//  */
// const ocrLogic = async (imageUrl: string): Promise<string> => {
// 	const worker = await createWorker("eng");
// 	const returnValue = await worker.recognize(imageUrl);
// 	await worker.terminate();

// 	return returnValue?.data?.text;
// };

/**
 * Gives the OCR string by calling the OCR function
 *
 * @param {string} imageUrl - the image url for the OCR to take place
 * @returns {Promise<string>} - the OCR value
 */
const ocr = async (imageUrl: string): Promise<string> => {
	const response = await axios.get(`${OCR_URL}?url=${imageUrl}`);

	return response?.data?.ocr;
};

export default ocr;
