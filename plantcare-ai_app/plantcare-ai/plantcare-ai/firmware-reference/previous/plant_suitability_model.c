int predict_plant_suitability(const float features[5]) {
    if (features[1] <= 0x1.0412b60000000p+6) {
        if (features[2] <= 0x1.ff312d0000000p+4) {
            if (features[2] <= 0x1.1fcf8d0000000p+4) {
                if (features[3] <= 0x1.2bfeb50000000p+6) {
                    if (features[4] <= 0x1.0b60000000000p+10) {
                        if (features[3] <= 0x1.6e2b930000000p+5) {
                            if (features[2] <= 0x1.54457c0000000p+3) {
                                return 1;
                            } else {
                                if (features[1] <= 0x1.ddbb180000000p+3) {
                                    if (features[2] <= 0x1.9884640000000p+3) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    return 0;
                                }
                            }
                        } else {
                            if (features[3] <= 0x1.cf4b550000000p+5) {
                                if (features[1] <= 0x1.6699018000000p+2) {
                                    return 0;
                                } else {
                                    if (features[4] <= 0x1.4940000000000p+9) {
                                        if (features[1] <= 0x1.61865d0000000p+3) {
                                            if (features[4] <= 0x1.5000000000000p+7) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        if (features[1] <= 0x1.8969c30000000p+5) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    }
                                }
                            } else {
                                if (features[2] <= 0x1.0ea2a40000000p+4) {
                                    return 0;
                                } else {
                                    if (features[0] <= 0x1.0000000000000p-1) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                }
                            }
                        }
                    } else {
                        if (features[3] <= 0x1.22f3e60000000p+5) {
                            if (features[1] <= 0x1.bd4b700000000p+4) {
                                if (features[0] <= 0x1.0000000000000p-1) {
                                    if (features[3] <= 0x1.f003a20000000p+4) {
                                        if (features[1] <= 0x1.500f0c0000000p+3) {
                                            return 0;
                                        } else {
                                            if (features[4] <= 0x1.1780000000000p+11) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        }
                                    } else {
                                        if (features[2] <= 0x1.caaec90000000p+3) {
                                            if (features[1] <= 0x1.579935c000000p+2) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            return 1;
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[1] <= 0x1.9b3c3a0000000p+5) {
                                    if (features[2] <= 0x1.9f920a0000000p+3) {
                                        if (features[3] <= 0x1.64b5160000000p+4) {
                                            return 1;
                                        } else {
                                            if (features[1] <= 0x1.8ddca70000000p+5) {
                                                if (features[1] <= 0x1.3482270000000p+5) {
                                                    return 0;
                                                } else {
                                                    return 0;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    } else {
                                        if (features[3] <= 0x1.798ad40000000p+4) {
                                            return 0;
                                        } else {
                                            if (features[1] <= 0x1.1f23ae0000000p+5) {
                                                if (features[1] <= 0x1.0e29920000000p+5) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                } else {
                                    if (features[3] <= 0x1.9ba4940000000p+4) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                }
                            }
                        } else {
                            if (features[1] <= 0x1.2cf77b0000000p+3) {
                                if (features[2] <= 0x1.aad33c0000000p+3) {
                                    if (features[1] <= 0x1.b0cb370000000p+1) {
                                        if (features[2] <= 0x1.7ddd000000000p+3) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    if (features[3] <= 0x1.7b50b00000000p+5) {
                                        return 1;
                                    } else {
                                        if (features[2] <= 0x1.b6fe100000000p+3) {
                                            return 1;
                                        } else {
                                            if (features[3] <= 0x1.2973270000000p+6) {
                                                if (features[4] <= 0x1.d4e0000000000p+11) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                }
                            } else {
                                if (features[1] <= 0x1.bde6290000000p+5) {
                                    if (features[2] <= 0x1.6105c70000000p+3) {
                                        if (features[3] <= 0x1.94c78b0000000p+5) {
                                            return 0;
                                        } else {
                                            if (features[2] <= 0x1.55011c0000000p+3) {
                                                if (features[4] <= 0x1.7710000000000p+11) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    } else {
                                        if (features[4] <= 0x1.5350000000000p+11) {
                                            if (features[0] <= 0x1.0000000000000p-1) {
                                                if (features[1] <= 0x1.0ddcc20000000p+5) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        } else {
                                            if (features[0] <= 0x1.0000000000000p-1) {
                                                if (features[4] <= 0x1.6620000000000p+11) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                if (features[1] <= 0x1.3139210000000p+5) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    if (features[0] <= 0x1.0000000000000p-1) {
                                        if (features[4] <= 0x1.7630000000000p+11) {
                                            return 0;
                                        } else {
                                            if (features[3] <= 0x1.f56eb90000000p+5) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        }
                                    } else {
                                        return 1;
                                    }
                                }
                            }
                        }
                    }
                } else {
                    if (features[1] <= 0x1.58e9c80000000p+5) {
                        if (features[2] <= 0x1.47e5010000000p+3) {
                            return 1;
                        } else {
                            if (features[3] <= 0x1.649b870000000p+6) {
                                if (features[2] <= 0x1.6a3a500000000p+3) {
                                    if (features[2] <= 0x1.662e840000000p+3) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[4] <= 0x1.06d0000000000p+11) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            }
                        }
                    } else {
                        if (features[0] <= 0x1.0000000000000p-1) {
                            return 0;
                        } else {
                            if (features[4] <= 0x1.ec80000000000p+9) {
                                return 0;
                            } else {
                                if (features[4] <= 0x1.6ee0000000000p+11) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            }
                        }
                    }
                }
            } else {
                if (features[4] <= 0x1.f300000000000p+9) {
                    if (features[3] <= 0x1.365f6a0000000p+6) {
                        if (features[3] <= 0x1.f30b040000000p+4) {
                            if (features[1] <= 0x1.873aad0000000p+4) {
                                if (features[0] <= 0x1.0000000000000p-1) {
                                    if (features[1] <= 0x1.9d09d20000000p+3) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[3] <= 0x1.73426e0000000p+4) {
                                    if (features[1] <= 0x1.e720ba0000000p+4) {
                                        return 1;
                                    } else {
                                        if (features[2] <= 0x1.68c9eb0000000p+4) {
                                            if (features[4] <= 0x1.8c00000000000p+8) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        } else {
                                            return 0;
                                        }
                                    }
                                } else {
                                    if (features[4] <= 0x1.b180000000000p+8) {
                                        if (features[0] <= 0x1.0000000000000p-1) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        return 1;
                                    }
                                }
                            }
                        } else {
                            if (features[3] <= 0x1.e825510000000p+5) {
                                if (features[4] <= 0x1.8800000000000p+4) {
                                    return 0;
                                } else {
                                    if (features[2] <= 0x1.f168650000000p+4) {
                                        if (features[4] <= 0x1.f100000000000p+9) {
                                            if (features[2] <= 0x1.e6d96a0000000p+4) {
                                                if (features[3] <= 0x1.2c705c0000000p+5) {
                                                    return 1;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                if (features[0] <= 0x1.0000000000000p-1) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        return 0;
                                    }
                                }
                            } else {
                                if (features[0] <= 0x1.0000000000000p-1) {
                                    if (features[1] <= 0x1.151f380000000p+5) {
                                        if (features[1] <= 0x1.3c40848000000p+3) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    if (features[2] <= 0x1.df3d450000000p+4) {
                                        return 1;
                                    } else {
                                        if (features[3] <= 0x1.0c19a20000000p+6) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        if (features[2] <= 0x1.ac355a0000000p+4) {
                            if (features[1] <= 0x1.ccb2040000000p+4) {
                                if (features[2] <= 0x1.3d13300000000p+4) {
                                    if (features[2] <= 0x1.3695c40000000p+4) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[4] <= 0x1.4e00000000000p+8) {
                                    return 1;
                                } else {
                                    if (features[4] <= 0x1.5a80000000000p+9) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                }
                            }
                        } else {
                            return 0;
                        }
                    }
                } else {
                    if (features[3] <= 0x1.2c13a50000000p+6) {
                        if (features[3] <= 0x1.e7aa580000000p+4) {
                            if (features[0] <= 0x1.0000000000000p-1) {
                                if (features[4] <= 0x1.2d80000000000p+11) {
                                    if (features[1] <= 0x1.28b4930000000p+5) {
                                        if (features[1] <= 0x1.466e210000000p+3) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    if (features[3] <= 0x1.dcfc140000000p+4) {
                                        return 1;
                                    } else {
                                        if (features[1] <= 0x1.4dcb2d0000000p+5) {
                                            return 2;
                                        } else {
                                            return 1;
                                        }
                                    }
                                }
                            } else {
                                if (features[4] <= 0x1.7cc0000000000p+11) {
                                    if (features[2] <= 0x1.e24bfd0000000p+4) {
                                        return 1;
                                    } else {
                                        if (features[3] <= 0x1.a66dc30000000p+4) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    }
                                } else {
                                    if (features[1] <= 0x1.1b8b940000000p+5) {
                                        return 0;
                                    } else {
                                        if (features[2] <= 0x1.d4967d0000000p+4) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    }
                                }
                            }
                        } else {
                            if (features[1] <= 0x1.41263a0000000p+3) {
                                if (features[2] <= 0x1.fdea9c0000000p+4) {
                                    if (features[4] <= 0x1.39a0000000000p+10) {
                                        if (features[0] <= 0x1.0000000000000p-1) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        if (features[3] <= 0x1.2a623b0000000p+5) {
                                            if (features[4] <= 0x1.7cb0000000000p+11) {
                                                return 1;
                                            } else {
                                                if (features[1] <= 0x1.c1b7e30000000p+0) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            if (features[2] <= 0x1.3e06090000000p+4) {
                                                if (features[3] <= 0x1.ef87510000000p+5) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[3] <= 0x1.24cc0e0000000p+5) {
                                    if (features[1] <= 0x1.18e5670000000p+5) {
                                        if (features[4] <= 0x1.28c0000000000p+11) {
                                            return 1;
                                        } else {
                                            if (features[0] <= 0x1.0000000000000p-1) {
                                                return 2;
                                            } else {
                                                if (features[1] <= 0x1.dfe9f70000000p+4) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            }
                                        }
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    if (features[0] <= 0x1.0000000000000p-1) {
                                        if (features[4] <= 0x1.37b0000000000p+11) {
                                            if (features[3] <= 0x1.e0f39d0000000p+5) {
                                                return 1;
                                            } else {
                                                if (features[1] <= 0x1.1b6cf20000000p+5) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            if (features[1] <= 0x1.1966cd0000000p+5) {
                                                if (features[3] <= 0x1.f434260000000p+5) {
                                                    return 2;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    } else {
                                        if (features[1] <= 0x1.16563e0000000p+5) {
                                            if (features[2] <= 0x1.e1f5b00000000p+4) {
                                                return 1;
                                            } else {
                                                if (features[4] <= 0x1.41e0000000000p+11) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            if (features[4] <= 0x1.7bc0000000000p+11) {
                                                if (features[2] <= 0x1.e0e0d60000000p+4) {
                                                    return 2;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        if (features[1] <= 0x1.80240f0000000p+3) {
                            if (features[3] <= 0x1.5d0a470000000p+6) {
                                if (features[3] <= 0x1.4a3fd20000000p+6) {
                                    if (features[2] <= 0x1.d3ff950000000p+4) {
                                        if (features[1] <= 0x1.9016090000000p+0) {
                                            return 0;
                                        } else {
                                            if (features[1] <= 0x1.11bd850000000p+3) {
                                                return 1;
                                            } else {
                                                if (features[1] <= 0x1.5b4d430000000p+3) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            }
                                        }
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                return 1;
                            }
                        } else {
                            if (features[2] <= 0x1.ed1c9e0000000p+4) {
                                if (features[4] <= 0x1.d2c0000000000p+11) {
                                    if (features[1] <= 0x1.f3e2e50000000p+5) {
                                        if (features[4] <= 0x1.0c40000000000p+10) {
                                            return 0;
                                        } else {
                                            if (features[3] <= 0x1.2e83950000000p+6) {
                                                if (features[3] <= 0x1.2d821b0000000p+6) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            } else {
                                                if (features[2] <= 0x1.c29ed40000000p+4) {
                                                    return 1;
                                                } else {
                                                    return 1;
                                                }
                                            }
                                        }
                                    } else {
                                        if (features[2] <= 0x1.a0788c0000000p+4) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    }
                                } else {
                                    if (features[0] <= 0x1.0000000000000p-1) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                }
                            } else {
                                if (features[4] <= 0x1.db40000000000p+11) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            }
                        }
                    }
                }
            }
        } else {
            if (features[4] <= 0x1.d580000000000p+9) {
                if (features[3] <= 0x1.1edfd10000000p+6) {
                    if (features[1] <= 0x1.cc418b0000000p+5) {
                        if (features[2] <= 0x1.3361670000000p+5) {
                            if (features[3] <= 0x1.0f783d0000000p+6) {
                                if (features[2] <= 0x1.1075140000000p+5) {
                                    if (features[2] <= 0x1.0e678d0000000p+5) {
                                        if (features[4] <= 0x1.8c00000000000p+7) {
                                            if (features[2] <= 0x1.03c1660000000p+5) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[3] <= 0x1.15001e0000000p+6) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            }
                        } else {
                            if (features[2] <= 0x1.3a445e0000000p+5) {
                                if (features[3] <= 0x1.77515a0000000p+5) {
                                    return 1;
                                } else {
                                    if (features[1] <= 0x1.74f85a0000000p+4) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                }
                            } else {
                                return 0;
                            }
                        }
                    } else {
                        if (features[0] <= 0x1.0000000000000p-1) {
                            return 0;
                        } else {
                            return 1;
                        }
                    }
                } else {
                    return 0;
                }
            } else {
                if (features[3] <= 0x1.2c00500000000p+6) {
                    if (features[3] <= 0x1.037e290000000p+5) {
                        if (features[1] <= 0x1.152aef0000000p+4) {
                            return 0;
                        } else {
                            if (features[3] <= 0x1.7818880000000p+4) {
                                if (features[2] <= 0x1.0336188000000p+5) {
                                    return 0;
                                } else {
                                    if (features[2] <= 0x1.255a8d0000000p+5) {
                                        return 1;
                                    } else {
                                        if (features[1] <= 0x1.eca35b0000000p+4) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    }
                                }
                            } else {
                                if (features[4] <= 0x1.8a10000000000p+11) {
                                    if (features[2] <= 0x1.1e12440000000p+5) {
                                        if (features[4] <= 0x1.5000000000000p+10) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        if (features[1] <= 0x1.40bfb60000000p+5) {
                                            if (features[4] <= 0x1.4800000000000p+11) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        } else {
                                            if (features[0] <= 0x1.0000000000000p-1) {
                                                if (features[3] <= 0x1.cffcc40000000p+4) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                } else {
                                    if (features[2] <= 0x1.020a208000000p+5) {
                                        return 2;
                                    } else {
                                        return 0;
                                    }
                                }
                            }
                        }
                    } else {
                        if (features[4] <= 0x1.3cf0000000000p+11) {
                            if (features[0] <= 0x1.0000000000000p-1) {
                                if (features[1] <= 0x1.14af3b0000000p+5) {
                                    if (features[1] <= 0x1.37ea900000000p+4) {
                                        return 0;
                                    } else {
                                        if (features[3] <= 0x1.d40e360000000p+5) {
                                            return 1;
                                        } else {
                                            if (features[4] <= 0x1.3890000000000p+11) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[3] <= 0x1.422ca90000000p+5) {
                                    if (features[1] <= 0x1.06d3ac8000000p+5) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 1;
                                }
                            }
                        } else {
                            if (features[1] <= 0x1.32f1f70000000p+5) {
                                if (features[0] <= 0x1.0000000000000p-1) {
                                    if (features[3] <= 0x1.dd76850000000p+5) {
                                        return 1;
                                    } else {
                                        if (features[2] <= 0x1.2492410000000p+5) {
                                            if (features[1] <= 0x1.26e7440000000p+3) {
                                                return 0;
                                            } else {
                                                if (features[1] <= 0x1.f925140000000p+4) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            return 0;
                                        }
                                    }
                                } else {
                                    if (features[4] <= 0x1.7640000000000p+11) {
                                        return 1;
                                    } else {
                                        if (features[1] <= 0x1.1655c40000000p+5) {
                                            return 0;
                                        } else {
                                            if (features[2] <= 0x1.26ae2f0000000p+5) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                }
                            } else {
                                if (features[2] <= 0x1.3fade50000000p+5) {
                                    if (features[3] <= 0x1.e042380000000p+5) {
                                        return 1;
                                    } else {
                                        if (features[0] <= 0x1.0000000000000p-1) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            }
                        }
                    }
                } else {
                    if (features[3] <= 0x1.52edcd0000000p+6) {
                        if (features[4] <= 0x1.3420000000000p+11) {
                            if (features[0] <= 0x1.0000000000000p-1) {
                                return 0;
                            } else {
                                if (features[1] <= 0x1.f6fb870000000p+4) {
                                    return 0;
                                } else {
                                    if (features[4] <= 0x1.2f80000000000p+10) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                }
                            }
                        } else {
                            if (features[1] <= 0x1.449a030000000p+5) {
                                if (features[4] <= 0x1.d910000000000p+11) {
                                    if (features[2] <= 0x1.0798820000000p+5) {
                                        return 0;
                                    } else {
                                        if (features[1] <= 0x1.d835c00000000p+2) {
                                            return 0;
                                        } else {
                                            if (features[2] <= 0x1.3a5d170000000p+5) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[4] <= 0x1.48f0000000000p+11) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            }
                        }
                    } else {
                        if (features[2] <= 0x1.3d88b10000000p+5) {
                            if (features[3] <= 0x1.62afdb0000000p+6) {
                                return 0;
                            } else {
                                if (features[3] <= 0x1.6335630000000p+6) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            }
                        } else {
                            if (features[2] <= 0x1.3ecbc20000000p+5) {
                                return 1;
                            } else {
                                return 0;
                            }
                        }
                    }
                }
            }
        }
    } else {
        if (features[2] <= 0x1.1a0eb60000000p+4) {
            if (features[3] <= 0x1.ece0820000000p+5) {
                if (features[3] <= 0x1.45838f0000000p+5) {
                    if (features[4] <= 0x1.7d20000000000p+11) {
                        return 0;
                    } else {
                        if (features[0] <= 0x1.0000000000000p-1) {
                            if (features[3] <= 0x1.c26f410000000p+4) {
                                return 0;
                            } else {
                                return 1;
                            }
                        } else {
                            return 0;
                        }
                    }
                } else {
                    if (features[4] <= 0x1.edc0000000000p+9) {
                        return 0;
                    } else {
                        if (features[3] <= 0x1.54955e0000000p+5) {
                            return 1;
                        } else {
                            if (features[0] <= 0x1.0000000000000p-1) {
                                if (features[4] <= 0x1.4400000000000p+11) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            } else {
                                if (features[4] <= 0x1.7080000000000p+11) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            }
                        }
                    }
                }
            } else {
                if (features[1] <= 0x1.8ca1450000000p+6) {
                    if (features[3] <= 0x1.20e5570000000p+6) {
                        if (features[3] <= 0x1.1e8c540000000p+6) {
                            if (features[3] <= 0x1.1c7b560000000p+6) {
                                return 0;
                            } else {
                                if (features[1] <= 0x1.66cd920000000p+6) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            }
                        } else {
                            return 1;
                        }
                    } else {
                        return 0;
                    }
                } else {
                    return 1;
                }
            }
        } else {
            if (features[2] <= 0x1.f5d4e70000000p+4) {
                if (features[3] <= 0x1.10251d0000000p+6) {
                    if (features[3] <= 0x1.34bf2b0000000p+5) {
                        if (features[0] <= 0x1.0000000000000p-1) {
                            if (features[3] <= 0x1.ddcf1b0000000p+4) {
                                if (features[4] <= 0x1.3ed0000000000p+11) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            } else {
                                return 1;
                            }
                        } else {
                            if (features[4] <= 0x1.69d0000000000p+11) {
                                if (features[4] <= 0x1.fc40000000000p+9) {
                                    return 0;
                                } else {
                                    if (features[2] <= 0x1.db645d0000000p+4) {
                                        if (features[2] <= 0x1.1fd0370000000p+4) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        return 0;
                                    }
                                }
                            } else {
                                return 0;
                            }
                        }
                    } else {
                        if (features[3] <= 0x1.e1fcef0000000p+5) {
                            if (features[2] <= 0x1.e4169b0000000p+4) {
                                if (features[4] <= 0x1.fc00000000000p+5) {
                                    if (features[2] <= 0x1.6004c20000000p+4) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 1;
                                }
                            } else {
                                if (features[2] <= 0x1.e8c1060000000p+4) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            }
                        } else {
                            if (features[2] <= 0x1.4f83550000000p+4) {
                                if (features[4] <= 0x1.42f0000000000p+11) {
                                    if (features[0] <= 0x1.0000000000000p-1) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    if (features[2] <= 0x1.216fdb0000000p+4) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                }
                            } else {
                                if (features[1] <= 0x1.8c250a0000000p+6) {
                                    if (features[3] <= 0x1.e6653e0000000p+5) {
                                        if (features[0] <= 0x1.0000000000000p-1) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 0;
                                }
                            }
                        }
                    }
                } else {
                    if (features[4] <= 0x1.1280000000000p+10) {
                        if (features[1] <= 0x1.0c423e0000000p+6) {
                            if (features[2] <= 0x1.9743ef0000000p+4) {
                                return 0;
                            } else {
                                return 1;
                            }
                        } else {
                            if (features[3] <= 0x1.147cab0000000p+6) {
                                if (features[3] <= 0x1.1319590000000p+6) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            } else {
                                return 0;
                            }
                        }
                    } else {
                        if (features[2] <= 0x1.9a83960000000p+4) {
                            if (features[2] <= 0x1.2280ec0000000p+4) {
                                if (features[3] <= 0x1.39fe220000000p+6) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[3] <= 0x1.189b9d0000000p+6) {
                                    if (features[3] <= 0x1.12567f0000000p+6) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    if (features[4] <= 0x1.a630000000000p+11) {
                                        if (features[0] <= 0x1.0000000000000p-1) {
                                            if (features[4] <= 0x1.3cb0000000000p+11) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        if (features[3] <= 0x1.2d00630000000p+6) {
                                            return 1;
                                        } else {
                                            if (features[0] <= 0x1.0000000000000p-1) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            if (features[2] <= 0x1.a8d1ef0000000p+4) {
                                return 0;
                            } else {
                                if (features[3] <= 0x1.2e2daf0000000p+6) {
                                    if (features[1] <= 0x1.89a1f40000000p+6) {
                                        if (features[3] <= 0x1.1c2c210000000p+6) {
                                            if (features[1] <= 0x1.5093030000000p+6) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    if (features[3] <= 0x1.6570160000000p+6) {
                                        if (features[4] <= 0x1.03b0000000000p+11) {
                                            if (features[0] <= 0x1.0000000000000p-1) {
                                                return 0;
                                            } else {
                                                if (features[2] <= 0x1.de2a350000000p+4) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            if (features[0] <= 0x1.0000000000000p-1) {
                                                if (features[4] <= 0x1.4d10000000000p+11) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                return 0;
                                            }
                                        }
                                    } else {
                                        return 1;
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                if (features[3] <= 0x1.2a2b240000000p+6) {
                    if (features[4] <= 0x1.f5c0000000000p+9) {
                        if (features[2] <= 0x1.fc2edf0000000p+4) {
                            return 1;
                        } else {
                            return 0;
                        }
                    } else {
                        if (features[3] <= 0x1.ea7ce00000000p+4) {
                            if (features[2] <= 0x1.fba9b70000000p+4) {
                                if (features[2] <= 0x1.faf1ad0000000p+4) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            } else {
                                return 0;
                            }
                        } else {
                            if (features[4] <= 0x1.7ef0000000000p+11) {
                                if (features[0] <= 0x1.0000000000000p-1) {
                                    if (features[4] <= 0x1.4100000000000p+11) {
                                        if (features[2] <= 0x1.fec8160000000p+4) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        if (features[3] <= 0x1.cbfd980000000p+5) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    }
                                } else {
                                    if (features[3] <= 0x1.3c50b20000000p+5) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                }
                            } else {
                                if (features[0] <= 0x1.0000000000000p-1) {
                                    if (features[3] <= 0x1.df167e0000000p+5) {
                                        return 1;
                                    } else {
                                        if (features[4] <= 0x1.d7e0000000000p+11) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            }
                        }
                    }
                } else {
                    return 0;
                }
            }
        }
    }
}