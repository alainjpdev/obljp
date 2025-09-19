# PicoLib - Simplified library for Raspberry Pi Pico W
import machine
import time
from machine import Pin, PWM, ADC

def led_on():
    Pin("LED", Pin.OUT).on()

def led_off():
    Pin("LED", Pin.OUT).off()

def led_blink(times=1, delay=0.5):
    led = Pin("LED", Pin.OUT)
    for _ in range(times):
        led.on()
        time.sleep(delay)
        led.off()
        time.sleep(delay)

def read_analog(pin):
    return ADC(Pin(pin)).read_u16()

def write_digital(pin, value):
    Pin(pin, Pin.OUT).value(value)

def read_digital(pin):
    return Pin(pin, Pin.IN).value()

def pwm_write(pin, duty):
    pwm = PWM(Pin(pin))
    pwm.freq(1000)
    pwm.duty_u16(int(duty * 65535 / 100))

def delay(ms):
    time.sleep(ms / 1000.0)
