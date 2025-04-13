import dayjs from 'dayjs'

export const getCurrentTime = () => dayjs().format('DD/MM/YY HH:mm:ss')

export const generateRandomNumber = () => (Math.floor(Math.random() * 13) + 3) * 1000