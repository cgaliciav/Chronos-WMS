import React from 'react'
import { Select } from 'antd'

const { Option } = Select

const mapeoOpciones = arr =>
  arr.map(item => (
    <Option value={item.id} key={`${Math.random()}`}>
      {item.nombre}{' '}
    </Option>
  ))

const mapeoOpciones2 = arr =>
  arr.map(item => (
    <Option value={item.id} key={`${Math.random()}`}>
      {item.nombre}{' '}
    </Option>
  ))

const formatoMonedaMexico = number => {
  const exp = /(\d)(?=(\d{3})+(?!\d))/g
  const rep = '$1,'
  const numberRounded = parseFloat(number).toFixed(2)
  const arr = numberRounded.toString().split('.')
  // const arr = number.toString().split('.');
  arr[0] = arr[0].replace(exp, rep)
  return `$ ${arr[1] ? arr.join('.') : arr[0]}`
}

/**
 * Filters and normalizes options for searching by removing diacritical marks and comparing strings case-insensitively
 * @param input - The search string to filter by
 * @param option - The option object to check against the input
 * @returns {boolean} True if the normalized option label contains the normalized input, false otherwise or if label is undefined 
 */
function normalizeAndFilterOptions(input, option) {
  if (option?.label === undefined) {
    return false;
  }
  const normalizedLabel = option.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedInput = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalizedLabel.toLowerCase().indexOf(normalizedInput.toLowerCase()) >= 0;
}

export { mapeoOpciones, mapeoOpciones2, formatoMonedaMexico,normalizeAndFilterOptions }
