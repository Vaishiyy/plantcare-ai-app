#include "plant_suitability_v3_model.h"

int predict_plant_suitability_v3(const float features[7]) {
    if (features[1] <= 0x1.1800000000000p+6) {
        if (features[2] <= 0x1.1834c90000000p+5) {
            if (features[2] <= 0x1.ffebe80000000p+3) {
                if (features[2] <= 0x1.5fd7960000000p+3) {
                    return 0;
                } else {
                    if (features[6] <= 0x1.e600000000000p+6) {
                        if (features[3] <= 0x1.67f51c0000000p+6) {
                            if (features[3] <= 0x1.10f4060000000p+4) {
                                if (features[1] <= 0x1.3a25280000000p+5) {
                                    if (features[1] <= 0x1.b8f6d40000000p+3) {
                                        return 0;
                                    } else {
                                        if (features[3] <= 0x1.591fd50000000p+3) {
                                            return 0;
                                        } else {
                                            if (features[0] <= 0x1.0000000000000p-1) {
                                                return 1;
                                            } else {
                                                if (features[1] <= 0x1.b2b4540000000p+4) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[1] <= 0x1.deb6420000000p+5) {
                                    if (features[1] <= 0x1.b2de530000000p+2) {
                                        if (features[0] <= 0x1.0000000000000p-1) {
                                            if (features[3] <= 0x1.2c7beb0000000p+6) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            if (features[1] <= 0x1.59bd410000000p+2) {
                                                return 0;
                                            } else {
                                                if (features[1] <= 0x1.a1162d0000000p+2) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        }
                                    } else {
                                        if (features[5] <= 0x1.6800000000000p+7) {
                                            if (features[1] <= 0x1.2a4cbc0000000p+4) {
                                                if (features[3] <= 0x1.e01fe20000000p+4) {
                                                    if (features[0] <= 0x1.0000000000000p-1) {
                                                        if (features[3] <= 0x1.3327010000000p+4) {
                                                            return 0;
                                                        } else {
                                                            return 1;
                                                        }
                                                    } else {
                                                        return 0;
                                                    }
                                                } else {
                                                    if (features[3] <= 0x1.5616480000000p+6) {
                                                        return 1;
                                                    } else {
                                                        if (features[0] <= 0x1.0000000000000p-1) {
                                                            return 1;
                                                        } else {
                                                            return 0;
                                                        }
                                                    }
                                                }
                                            } else {
                                                if (features[3] <= 0x1.31b2600000000p+6) {
                                                    return 1;
                                                } else {
                                                    if (features[1] <= 0x1.89a4850000000p+5) {
                                                        return 1;
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
                                            if (features[5] <= 0x1.6b00000000000p+7) {
                                                return 0;
                                            } else {
                                                if (features[1] <= 0x1.d08a560000000p+5) {
                                                    if (features[1] <= 0x1.30cd9d0000000p+3) {
                                                        return 0;
                                                    } else {
                                                        if (features[3] <= 0x1.9c93af0000000p+4) {
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
                                    if (features[0] <= 0x1.0000000000000p-1) {
                                        return 0;
                                    } else {
                                        if (features[1] <= 0x1.dfdc130000000p+5) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    }
                                }
                            }
                        } else {
                            if (features[0] <= 0x1.0000000000000p-1) {
                                return 0;
                            } else {
                                if (features[1] <= 0x1.4283480000000p+4) {
                                    return 0;
                                } else {
                                    if (features[5] <= 0x1.5900000000000p+7) {
                                        return 1;
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
            } else {
                if (features[3] <= 0x1.53455e0000000p+6) {
                    if (features[1] <= 0x1.414aec0000000p+3) {
                        if (features[0] <= 0x1.0000000000000p-1) {
                            if (features[6] <= 0x1.da00000000000p+6) {
                                if (features[1] <= 0x1.3ee6ea0000000p+3) {
                                    if (features[5] <= 0x1.5680000000000p+8) {
                                        if (features[5] <= 0x1.d600000000000p+7) {
                                            return 1;
                                        } else {
                                            if (features[3] <= 0x1.1cea8b0000000p+6) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        }
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    return 2;
                                }
                            } else {
                                return 0;
                            }
                        } else {
                            if (features[1] <= 0x1.3dcb6c0000000p+2) {
                                return 0;
                            } else {
                                if (features[5] <= 0x1.0a00000000000p+8) {
                                    if (features[6] <= 0x1.a800000000000p+6) {
                                        if (features[3] <= 0x1.c705080000000p+3) {
                                            return 0;
                                        } else {
                                            if (features[2] <= 0x1.0bfc370000000p+5) {
                                                return 1;
                                            } else {
                                                if (features[5] <= 0x1.ae00000000000p+6) {
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
                                    if (features[2] <= 0x1.a357080000000p+4) {
                                        if (features[1] <= 0x1.be07740000000p+2) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        return 0;
                                    }
                                }
                            }
                        }
                    } else {
                        if (features[3] <= 0x1.4969a40000000p+4) {
                            if (features[3] <= 0x1.be92520000000p+3) {
                                if (features[0] <= 0x1.0000000000000p-1) {
                                    if (features[1] <= 0x1.af17640000000p+5) {
                                        if (features[6] <= 0x1.f000000000000p+6) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        if (features[2] <= 0x1.34e3540000000p+4) {
                                            if (features[1] <= 0x1.fafe410000000p+5) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            return 0;
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[6] <= 0x1.e600000000000p+6) {
                                    if (features[1] <= 0x1.e86c8e0000000p+5) {
                                        if (features[3] <= 0x1.42fd5e0000000p+4) {
                                            if (features[5] <= 0x1.9f00000000000p+7) {
                                                if (features[3] <= 0x1.d53ccd0000000p+3) {
                                                    if (features[0] <= 0x1.0000000000000p-1) {
                                                        return 1;
                                                    } else {
                                                        return 0;
                                                    }
                                                } else {
                                                    if (features[2] <= 0x1.04a26e0000000p+5) {
                                                        return 1;
                                                    } else {
                                                        if (features[1] <= 0x1.3ca80a0000000p+4) {
                                                            return 0;
                                                        } else {
                                                            return 1;
                                                        }
                                                    }
                                                }
                                            } else {
                                                if (features[1] <= 0x1.80a6200000000p+5) {
                                                    if (features[2] <= 0x1.080cf18000000p+5) {
                                                        return 1;
                                                    } else {
                                                        return 0;
                                                    }
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            if (features[0] <= 0x1.0000000000000p-1) {
                                                if (features[1] <= 0x1.841b730000000p+5) {
                                                    return 2;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                if (features[1] <= 0x1.1b9f978000000p+4) {
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
                                            if (features[3] <= 0x1.e538710000000p+3) {
                                                return 0;
                                            } else {
                                                if (features[2] <= 0x1.0981e70000000p+5) {
                                                    return 1;
                                                } else {
                                                    if (features[1] <= 0x1.0389ec8000000p+6) {
                                                        return 0;
                                                    } else {
                                                        return 1;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            }
                        } else {
                            if (features[5] <= 0x1.6700000000000p+7) {
                                if (features[6] <= 0x1.de00000000000p+6) {
                                    if (features[2] <= 0x1.fff1cd0000000p+4) {
                                        if (features[3] <= 0x1.dfb3b30000000p+4) {
                                            if (features[0] <= 0x1.0000000000000p-1) {
                                                if (features[1] <= 0x1.6dfc830000000p+5) {
                                                    return 2;
                                                } else {
                                                    if (features[1] <= 0x1.dfc30d0000000p+5) {
                                                        return 1;
                                                    } else {
                                                        return 0;
                                                    }
                                                }
                                            } else {
                                                return 1;
                                            }
                                        } else {
                                            if (features[1] <= 0x1.3450fa0000000p+4) {
                                                if (features[0] <= 0x1.0000000000000p-1) {
                                                    if (features[3] <= 0x1.2c5f570000000p+6) {
                                                        return 2;
                                                    } else {
                                                        return 1;
                                                    }
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                if (features[0] <= 0x1.0000000000000p-1) {
                                                    if (features[1] <= 0x1.6807410000000p+5) {
                                                        if (features[3] <= 0x1.2bff5e0000000p+6) {
                                                            return 2;
                                                        } else {
                                                            return 1;
                                                        }
                                                    } else {
                                                        if (features[1] <= 0x1.e02d180000000p+5) {
                                                            return 1;
                                                        } else {
                                                            return 0;
                                                        }
                                                    }
                                                } else {
                                                    if (features[1] <= 0x1.3f77010000000p+4) {
                                                        return 1;
                                                    } else {
                                                        return 2;
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        if (features[0] <= 0x1.0000000000000p-1) {
                                            if (features[1] <= 0x1.6a20000000000p+5) {
                                                if (features[3] <= 0x1.31ded10000000p+6) {
                                                    return 2;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                if (features[1] <= 0x1.e217080000000p+5) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            return 1;
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[1] <= 0x1.e177e70000000p+5) {
                                    if (features[1] <= 0x1.115f1e0000000p+4) {
                                        if (features[3] <= 0x1.de54ed0000000p+4) {
                                            if (features[0] <= 0x1.0000000000000p-1) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        if (features[3] <= 0x1.40a07f0000000p+6) {
                                            return 1;
                                        } else {
                                            if (features[3] <= 0x1.4240f00000000p+6) {
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
                                        return 1;
                                    }
                                }
                            }
                        }
                    }
                } else {
                    if (features[0] <= 0x1.0000000000000p-1) {
                        if (features[3] <= 0x1.6832840000000p+6) {
                            if (features[1] <= 0x1.e08c910000000p+5) {
                                if (features[6] <= 0x1.0400000000000p+7) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            } else {
                                return 0;
                            }
                        } else {
                            return 0;
                        }
                    } else {
                        if (features[6] <= 0x1.d000000000000p+6) {
                            if (features[1] <= 0x1.2b568f0000000p+2) {
                                return 0;
                            } else {
                                if (features[3] <= 0x1.5409620000000p+6) {
                                    if (features[2] <= 0x1.ba7a860000000p+4) {
                                        if (features[2] <= 0x1.a2ef570000000p+4) {
                                            if (features[2] <= 0x1.751e9e0000000p+4) {
                                                return 2;
                                            } else {
                                                return 1;
                                            }
                                        } else {
                                            return 2;
                                        }
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    if (features[2] <= 0x1.11900e0000000p+5) {
                                        if (features[5] <= 0x1.7800000000000p+7) {
                                            return 1;
                                        } else {
                                            if (features[1] <= 0x1.6b27fc8000000p+4) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        }
                                    } else {
                                        if (features[1] <= 0x1.35ccc50000000p+4) {
                                            return 0;
                                        } else {
                                            return 1;
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
        } else {
            if (features[2] <= 0x1.3ff2f20000000p+5) {
                if (features[0] <= 0x1.0000000000000p-1) {
                    if (features[1] <= 0x1.e0fb3b0000000p+5) {
                        if (features[6] <= 0x1.e800000000000p+6) {
                            if (features[3] <= 0x1.66d99b0000000p+6) {
                                if (features[3] <= 0x1.301f5e0000000p+6) {
                                    if (features[3] <= 0x1.3a091d0000000p+4) {
                                        if (features[5] <= 0x1.1b00000000000p+7) {
                                            if (features[1] <= 0x1.5f0dbe0000000p+5) {
                                                if (features[1] <= 0x1.2c2c130000000p+3) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        if (features[2] <= 0x1.18470d0000000p+5) {
                                            if (features[3] <= 0x1.f4fd810000000p+4) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        } else {
                                            if (features[5] <= 0x1.1780000000000p+8) {
                                                return 1;
                                            } else {
                                                if (features[2] <= 0x1.39b5bf0000000p+5) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    if (features[1] <= 0x1.637aaa0000000p+5) {
                                        if (features[1] <= 0x1.182eda0000000p+3) {
                                            return 0;
                                        } else {
                                            if (features[5] <= 0x1.6600000000000p+7) {
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
                                return 0;
                            }
                        } else {
                            return 0;
                        }
                    } else {
                        return 0;
                    }
                } else {
                    if (features[2] <= 0x1.2802510000000p+5) {
                        if (features[6] <= 0x1.be00000000000p+6) {
                            if (features[1] <= 0x1.10c4eb0000000p+4) {
                                if (features[1] <= 0x1.6504db0000000p+2) {
                                    return 0;
                                } else {
                                    if (features[3] <= 0x1.e491c50000000p+4) {
                                        return 0;
                                    } else {
                                        if (features[1] <= 0x1.3f30710000000p+3) {
                                            return 1;
                                        } else {
                                            if (features[4] <= 0x1.0000000000000p-1) {
                                                if (features[2] <= 0x1.23fb9d0000000p+5) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            } else {
                                                return 0;
                                            }
                                        }
                                    }
                                }
                            } else {
                                if (features[3] <= 0x1.de57030000000p+3) {
                                    return 0;
                                } else {
                                    if (features[5] <= 0x1.6000000000000p+7) {
                                        return 1;
                                    } else {
                                        if (features[3] <= 0x1.45e56f0000000p+6) {
                                            if (features[3] <= 0x1.c7c5700000000p+4) {
                                                return 0;
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
                            return 0;
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
        if (features[1] <= 0x1.53ea490000000p+6) {
            if (features[0] <= 0x1.0000000000000p-1) {
                return 0;
            } else {
                if (features[2] <= 0x1.27f4780000000p+5) {
                    if (features[3] <= 0x1.ebe8430000000p+3) {
                        return 0;
                    } else {
                        if (features[6] <= 0x1.cc00000000000p+6) {
                            if (features[2] <= 0x1.7a6eef0000000p+3) {
                                if (features[4] <= 0x1.0000000000000p-1) {
                                    if (features[1] <= 0x1.4894450000000p+6) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[5] <= 0x1.1900000000000p+8) {
                                    if (features[2] <= 0x1.061fee0000000p+5) {
                                        if (features[2] <= 0x1.fcba030000000p+3) {
                                            if (features[3] <= 0x1.e913660000000p+4) {
                                                return 0;
                                            } else {
                                                if (features[3] <= 0x1.5324b40000000p+6) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        if (features[3] <= 0x1.f607070000000p+4) {
                                            return 0;
                                        } else {
                                            if (features[3] <= 0x1.55a9cf0000000p+6) {
                                                if (features[5] <= 0x1.aa00000000000p+7) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            } else {
                                                return 0;
                                            }
                                        }
                                    }
                                } else {
                                    if (features[5] <= 0x1.5680000000000p+8) {
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
                    return 0;
                }
            }
        } else {
            return 0;
        }
    }
}